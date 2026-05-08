const { TextractClient, AnalyzeExpenseCommand } = require('@aws-sdk/client-textract');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
// Client Initialization (outside handler for connection reuse)
// ─────────────────────────────────────────────────────────────
const textractClient = new TextractClient({});
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Set this via Lambda Environment Variables or hard-code for now.
// Example: amplify-expensetracker22-dev-Expenses
const EXPENSES_TABLE_NAME = process.env.EXPENSES_TABLE_NAME || 'Expenses';

// ───────────────────────────────────────────────────────────────
// Helper: Extract a specific field from Textract SummaryFields
// Returns the value string or the provided fallback.
// ───────────────────────────────────────────────────────────────
function extractField(summaryFields, fieldType, fallback) {
  if (!Array.isArray(summaryFields)) return fallback;

  for (const field of summaryFields) {
    if (field.Type?.Text === fieldType) {
      const value = field.ValueDetection?.Text;
      if (value && value.trim().length > 0) return value.trim();
    }
  }
  return fallback;
}

// ───────────────────────────────────────────────────────────────
// Helper: Parse an amount string from Textract into a float.
// Strips leading/trailing currency symbols, spaces, and commas.
// Returns null if the result is not a valid positive number.
// ───────────────────────────────────────────────────────────────
function parseAmount(raw) {
  if (!raw || raw === 'Unknown') return null;
  // Remove all characters that are not digits, dots, or minus signs
  const cleaned = raw.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isFinite(num) && num > 0 ? num : null;
}

// ───────────────────────────────────────────────────────────────
// Helper: Normalise a Textract date string to YYYY-MM-DD.
// Textract may return dates in many formats:
//   "8 May 2026", "08/05/26", "05-08-2026", "2026-05-08", etc.
// Falls back to today's ISO date if parsing fails.
// ───────────────────────────────────────────────────────────────
const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function normaliseDate(raw, fallback) {
  if (!raw || raw === 'Unknown') return fallback;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // "8 May 2026" or "08 May 2026" or "May 8, 2026"
  const wordy = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (wordy) {
    const [, day, mon, year] = wordy;
    const m = MONTH_MAP[mon.slice(0, 3).toLowerCase()];
    if (m !== undefined) {
      return `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const wordyAlt = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (wordyAlt) {
    const [, mon, day, year] = wordyAlt;
    const m = MONTH_MAP[mon.slice(0, 3).toLowerCase()];
    if (m !== undefined) {
      return `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Numeric formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY etc.
  // We assume DD/MM/YYYY (most common for Indian receipts)
  const numericFull = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (numericFull) {
    const [, dd, mm, yyyy] = numericFull;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // DD/MM/YY short year
  const numericShort = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
  if (numericShort) {
    const [, dd, mm, yy] = numericShort;
    const yyyy = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // Last resort: let JS try (may give wrong timezone on some runtimes)
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  console.warn(`[normaliseDate] Could not parse date: "${raw}" — using fallback.`);
  return fallback;
}

// ─────────────────────────────────────────────────────────────
// Lambda Handler
// Triggered by S3 PutObject on the Amplify storage bucket.
// Flow: S3 → Textract AnalyzeExpense → DynamoDB Put
// ─────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  console.log('[processReceipt] Received S3 event:', JSON.stringify(event, null, 2));

  // ── 1. Parse S3 event ──────────────────────────────────────
  let bucket, key;
  try {
    const record = event.Records[0];
    bucket = record.s3.bucket.name;
    key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log(`[processReceipt] Processing object: s3://${bucket}/${key}`);
  } catch (parseError) {
    console.error('[processReceipt] FATAL — Failed to parse S3 event record:', parseError);
    // Nothing useful we can do without bucket/key — exit gracefully
    return { statusCode: 400, body: 'Malformed S3 event' };
  }

  // ── 2. Call Textract AnalyzeExpense ─────────────────────────
  let extractedData = {
    totalAmount:  'Unknown',
    merchantName: 'Unknown',
    date:         new Date().toISOString().split('T')[0], // fallback to today
    s3Key:        key,
  };

  try {
    console.log('[processReceipt] Sending document to Textract AnalyzeExpense…');
    const command = new AnalyzeExpenseCommand({
      Document: {
        S3Object: { Bucket: bucket, Name: key },
      },
    });

    const response = await textractClient.send(command);
    console.log('[processReceipt] Textract responded successfully.');

    if (response.ExpenseDocuments && response.ExpenseDocuments.length > 0) {
      const doc = response.ExpenseDocuments[0];
      const fields = doc.SummaryFields || [];

      // ── Log ALL detected summary fields for CloudWatch debugging ──
      console.log('[processReceipt] All SummaryFields detected by Textract:');
      fields.forEach(f => {
        console.log(`  TYPE="${f.Type?.Text}"  VALUE="${f.ValueDetection?.Text}"  CONF=${f.ValueDetection?.Confidence?.toFixed(1)}`);
      });

      // ── Amount: try multiple field types in priority order ────────
      // Textract uses different labels depending on receipt type/locale.
      const AMOUNT_FIELD_PRIORITY = [
        'TOTAL',          // Most common
        'SUBTOTAL',       // Pre-tax total (use if TOTAL missing)
        'AMOUNT_DUE',     // Invoices
        'AMOUNT_PAID',    // Payment receipts
        'NET_AMOUNT',     // Net billing
        'GRAND_TOTAL',    // Some POS receipts
        'BALANCE_DUE',    // Partial-pay invoices
      ];

      for (const fieldType of AMOUNT_FIELD_PRIORITY) {
        const val = extractField(fields, fieldType, null);
        if (val) {
          console.log(`[processReceipt] Amount found via field type "${fieldType}": "${val}"`);
          extractedData.totalAmount = val;
          break;
        }
      }

      // ── Amount: last resort — scan line items, take the largest ──
      if (extractedData.totalAmount === 'Unknown') {
        console.warn('[processReceipt] No amount in SummaryFields — scanning LineItems…');
        let maxAmount = 0;
        const lineItemGroups = doc.LineItemGroups || [];
        for (const group of lineItemGroups) {
          for (const lineItem of (group.LineItems || [])) {
            for (const expense of (lineItem.LineItemExpenseFields || [])) {
              if (expense.Type?.Text === 'PRICE' || expense.Type?.Text === 'AMOUNT') {
                const parsed = parseAmount(expense.ValueDetection?.Text);
                if (parsed && parsed > maxAmount) maxAmount = parsed;
              }
            }
          }
        }
        if (maxAmount > 0) {
          extractedData.totalAmount = String(maxAmount);
          console.log(`[processReceipt] Amount derived from LineItems max PRICE: ${maxAmount}`);
        } else {
          console.error('[processReceipt] WARNING — Could not detect any amount on this receipt.');
        }
      }

      // ── Merchant: try multiple field types ────────────────────────
      const MERCHANT_FIELD_PRIORITY = [
        'VENDOR_NAME',
        'MERCHANT_NAME',
        'RECEIVER_NAME',
        'NAME',
      ];
      for (const fieldType of MERCHANT_FIELD_PRIORITY) {
        const val = extractField(fields, fieldType, null);
        if (val) {
          console.log(`[processReceipt] Merchant found via field type "${fieldType}": "${val}"`);
          extractedData.merchantName = val;
          break;
        }
      }

      // ── Date: try INVOICE_RECEIPT_DATE then ORDER_DATE ────────────
      const DATE_FIELD_PRIORITY = ['INVOICE_RECEIPT_DATE', 'ORDER_DATE', 'DUE_DATE'];
      for (const fieldType of DATE_FIELD_PRIORITY) {
        const val = extractField(fields, fieldType, null);
        if (val) {
          console.log(`[processReceipt] Date found via field type "${fieldType}": "${val}"`);
          extractedData.date = val;
          break;
        }
      }

    } else {
      console.error('[processReceipt] WARNING — Textract returned zero ExpenseDocuments. The image may not be a recognisable receipt.');
    }
  } catch (textractError) {
    console.error('[processReceipt] ERROR — Textract AnalyzeExpense call failed:', textractError);
    console.error('[processReceipt] Proceeding with fallback values to avoid data loss.');
    // We intentionally do NOT throw — the record will still be saved to DynamoDB
    // with fallback values so the user can manually correct it later.
  }

  // ── 3. Persist to DynamoDB ─────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const parsedAmount = parseAmount(extractedData.totalAmount);
  const normalisedDate = normaliseDate(extractedData.date, today);

  console.log(`[processReceipt] Raw amount: "${extractedData.totalAmount}" → parsed: ${parsedAmount}`);
  console.log(`[processReceipt] Raw date:   "${extractedData.date}" → normalised: ${normalisedDate}`);

  const expenseRecord = {
    id:        crypto.randomUUID(),
    date:      normalisedDate,
    merchant:  extractedData.merchantName !== 'Unknown' ? extractedData.merchantName : 'Unknown',
    amount:    parsedAmount !== null ? parsedAmount : 0,
    category:  'Other',
    s3Key:     extractedData.s3Key,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source:    'receipt',
  };

  try {
    console.log('[processReceipt] Writing expense record to DynamoDB:', JSON.stringify(expenseRecord, null, 2));
    await ddbClient.send(
      new PutCommand({
        TableName: EXPENSES_TABLE_NAME,
        Item: expenseRecord,
      })
    );
    console.log(`[processReceipt] SUCCESS — Record ${expenseRecord.id} saved to ${EXPENSES_TABLE_NAME}.`);
  } catch (dynamoError) {
    console.error('[processReceipt] ERROR — DynamoDB PutItem failed:', dynamoError);
    console.error('[processReceipt] Record that failed to persist:', JSON.stringify(expenseRecord, null, 2));
    // Throw here so the Lambda reports a failure and S3 can retry the event
    throw dynamoError;
  }

  // ── 4. Return extracted data ───────────────────────────────
  console.log('[processReceipt] === FINAL EXTRACTED DATA ===');
  console.log(JSON.stringify(expenseRecord, null, 2));
  console.log('[processReceipt] ============================');

  return {
    statusCode: 200,
    body: expenseRecord,
  };
};