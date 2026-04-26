/**
 * api.js — Expense Tracker API client
 *
 * Calls the processReceipt-dev Lambda directly using AWS SDK v3.
 * Authentication is via Amplify's Cognito Identity Pool credentials
 * (the logged-in user automatically gets signed AWS credentials).
 *
 * The Lambda handles routing via its httpMethod + pathParameters.
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const REGION        = 'ap-south-1';
const FUNCTION_NAME = 'processReceipt-dev';

// ── Get a LambdaClient with fresh Cognito credentials ─────────
async function getLambdaClient() {
  const session     = await fetchAuthSession();
  const credentials = session.credentials;
  return new LambdaClient({ region: REGION, credentials });
}

// ── Core invoker ──────────────────────────────────────────────
async function invoke(httpMethod, path, body = undefined, pathParameters = {}) {
  const client = await getLambdaClient();

  const payload = {
    httpMethod,
    path,
    pathParameters: Object.keys(pathParameters).length ? pathParameters : null,
    body: body !== undefined ? JSON.stringify(body) : null,
    headers: { 'Content-Type': 'application/json' },
  };

  const command = new InvokeCommand({
    FunctionName: FUNCTION_NAME,
    Payload: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const decoded  = JSON.parse(new TextDecoder().decode(response.Payload));

  if (response.FunctionError) {
    throw new Error(decoded.errorMessage || 'Lambda invocation error');
  }

  const parsed = JSON.parse(decoded.body || '{}');
  if (decoded.statusCode >= 400) {
    throw new Error(parsed.error || `HTTP ${decoded.statusCode}`);
  }
  return parsed;
}

// ── Public API ────────────────────────────────────────────────

/** List all expenses sorted newest-first */
export async function listExpenses() {
  return invoke('GET', '/expenses');
}

/** Get a single expense */
export async function getExpense(id) {
  return invoke('GET', `/expenses/${id}`, undefined, { id });
}

/** Create a new expense */
export async function createExpense(data) {
  return invoke('POST', '/expenses', data);
}

/** Update an expense */
export async function updateExpense(id, data) {
  return invoke('PUT', `/expenses/${id}`, data, { id });
}

/** Delete an expense */
export async function deleteExpense(id) {
  return invoke('DELETE', `/expenses/${id}`, undefined, { id });
}

// ── Demo-mode mock ────────────────────────────────────────────
const MOCK_EXPENSES = [
  { id: '1', date: '2026-04-18', merchant: 'Amazon Web Services', amount: 84.5,  category: 'Bills'  },
  { id: '2', date: '2026-04-16', merchant: 'Uber Rides',           amount: 24.0,  category: 'Travel' },
  { id: '3', date: '2026-04-12', merchant: 'Local Coffee Shop',    amount: 6.25,  category: 'Food'   },
  { id: '4', date: '2026-04-10', merchant: 'Zomato',               amount: 310.0, category: 'Food'   },
  { id: '5', date: '2026-04-05', merchant: 'Netflix',              amount: 649.0, category: 'Bills'  },
];

let mockStore = [...MOCK_EXPENSES];

export const mockApi = {
  listExpenses: async () => ({
    items: [...mockStore].sort((a, b) => new Date(b.date) - new Date(a.date)),
  }),
  createExpense: async (data) => {
    const item = { id: `local-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
    mockStore = [item, ...mockStore];
    return item;
  },
  updateExpense: async (id, data) => {
    mockStore = mockStore.map(e => e.id === id ? { ...e, ...data } : e);
    return mockStore.find(e => e.id === id);
  },
  deleteExpense: async (id) => {
    mockStore = mockStore.filter(e => e.id !== id);
    return { success: true, id };
  },
};
