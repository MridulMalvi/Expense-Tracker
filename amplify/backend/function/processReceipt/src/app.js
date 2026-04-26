/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_DATA_BUCKETNAME
Amplify Params - DO NOT EDIT */

'use strict';

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const rawClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(rawClient);

const TABLE_NAME =
  process.env.EXPENSES_TABLE_NAME ||
  `Expenses-${process.env.ENV || 'dev'}`;

// ─── Self-Bootstrap: create table if missing ─────────────────
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await rawClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    tableReady = true;
    console.log(`[ensureTable] Table ${TABLE_NAME} already exists.`);
  } catch (err) {
    console.log(`[ensureTable] DescribeTable error: ${err.name} — ${err.message}`);
    if (err.name === 'ResourceNotFoundException') {
      console.log(`[ensureTable] Table ${TABLE_NAME} not found — creating…`);
      try {
        await rawClient.send(
          new CreateTableCommand({
            TableName: TABLE_NAME,
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
            KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          })
        );
        // Wait for table to become ACTIVE
        await new Promise(r => setTimeout(r, 5000));
        tableReady = true;
        console.log(`[ensureTable] Table ${TABLE_NAME} created successfully.`);
      } catch (createErr) {
        console.error(`[ensureTable] CreateTable failed: ${createErr.name} — ${createErr.message}`);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

// ─── CORS headers ────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
  };
}

// ─── Route handlers ───────────────────────────────────────────

async function listExpenses() {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = (result.Items || []).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  return respond(200, { items });
}

async function getExpense(id) {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
  if (!result.Item) return respond(404, { error: 'Expense not found' });
  return respond(200, result.Item);
}

async function createExpense(event) {
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return respond(400, { error: 'Invalid JSON body' }); }

  const { date, merchant, amount, category } = body;
  if (!date || !merchant || amount === undefined) {
    return respond(400, { error: 'date, merchant, and amount are required' });
  }

  const item = {
    id: crypto.randomUUID(),
    date,
    merchant,
    amount: parseFloat(amount),
    category: category || 'Other',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  console.log('[createExpense] Created:', item.id);
  return respond(201, item);
}

async function updateExpense(id, event) {
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return respond(400, { error: 'Invalid JSON body' }); }

  const allowed = ['date', 'merchant', 'amount', 'category'];
  const updates = [];
  const names = {};
  const values = { ':updatedAt': new Date().toISOString() };

  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = field === 'amount' ? parseFloat(body[field]) : body[field];
    }
  }

  if (updates.length === 0) {
    return respond(400, { error: 'No updatable fields provided' });
  }

  updates.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );
  console.log('[updateExpense] Updated:', id);
  return respond(200, result.Attributes);
}

async function deleteExpense(id) {
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
  console.log('[deleteExpense] Deleted:', id);
  return respond(200, { success: true, id });
}

// ─── Main Handler ─────────────────────────────────────────────
exports.handler = async function (event) {
  console.log('[expenseApi] Event:', JSON.stringify(event, null, 2));

  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const id     = event.pathParameters?.id;

  // Preflight CORS
  if (method === 'OPTIONS') return respond(200, {});

  try {
    await ensureTable();

    if (method === 'GET'    && !id) return await listExpenses();
    if (method === 'GET'    &&  id) return await getExpense(id);
    if (method === 'POST')          return await createExpense(event);
    if (method === 'PUT'    &&  id) return await updateExpense(id, event);
    if (method === 'DELETE' &&  id) return await deleteExpense(id);

    return respond(404, { error: `No handler for ${method}` });
  } catch (err) {
    console.error('[expenseApi] Unhandled error:', err);
    return respond(500, { error: err.message });
  }
};
