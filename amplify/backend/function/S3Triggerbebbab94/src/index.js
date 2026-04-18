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

// ─────────────────────────────────────────────────────────────
// Helper: Extract a specific field from Textract SummaryFields
// Returns the value string or the provided fallback.
// ─────────────────────────────────────────────────────────────
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
      const fields = doc.SummaryFields;

      // Extract with safe fallbacks — Lambda never crashes on missing data
      extractedData.totalAmount  = extractField(fields, 'TOTAL',                 'Unknown');
      extractedData.merchantName = extractField(fields, 'VENDOR_NAME',           'Unknown');
      extractedData.date         = extractField(fields, 'INVOICE_RECEIPT_DATE',  extractedData.date);

      // Log any fields that fell back so we can monitor quality in CloudWatch
      if (extractedData.totalAmount === 'Unknown') {
        console.error('[processReceipt] WARNING — Textract could not detect a TOTAL field on this receipt.');
      }
      if (extractedData.merchantName === 'Unknown') {
        console.error('[processReceipt] WARNING — Textract could not detect a VENDOR_NAME field on this receipt.');
      }
      if (extractedData.date === new Date().toISOString().split('T')[0]) {
        console.error('[processReceipt] WARNING — Textract could not detect a DATE field; using today as fallback.');
      }
    } else {
      console.error('[processReceipt] WARNING — Textract returned zero ExpenseDocuments. The image may not be a recognisable receipt.');
    }
  } catch (textractError) {
    console.error('[processReceipt] ERROR — Textract AnalyzeExpense call failed:', textractError);
    console.error('[processReceipt] Proceeding with fallback values to avoid data loss.');
    // We intentionally do NOT throw — the record will still be saved to DynamoDB
    // with "Unknown" fields so the user can manually correct it later.
  }

  // ── 3. Persist to DynamoDB ─────────────────────────────────
  const expenseRecord = {
    id:        crypto.randomUUID(),
    date:      extractedData.date,
    merchant:  extractedData.merchantName,
    amount:    extractedData.totalAmount,
    s3Key:     extractedData.s3Key,
    createdAt: new Date().toISOString(),
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