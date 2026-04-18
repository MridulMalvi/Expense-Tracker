import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { RefreshCw, AlertCircle, CheckCircle, X, Inbox } from 'lucide-react';

const client = generateClient();

const listExpensesQuery = /* GraphQL */ `
  query ListExpenses {
    listExpenses {
      items {
        id
        date
        merchant
        amount
      }
    }
  }
`;

// ─────────────────────────────────────────────
// Toast Component (self-contained for ExpenseList)
// ─────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:bottom-6 z-[100] flex flex-col gap-3 pointer-events-none w-[90vw] sm:w-auto sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-medium backdrop-blur-sm w-full ${
            t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton Row (loading placeholder)
// ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-40 bg-gray-200 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4 flex justify-end">
        <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse" />
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// ExpenseList Component
// ─────────────────────────────────────────────
export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [toasts, setToasts] = useState([]);
  const hasFetchedOnce = useRef(false);

  // ── Toast helpers ──────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch logic ────────────────────────────
  const fetchExpenses = useCallback(async ({ isManualRefresh = false } = {}) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(false);

    try {
      const expenseData = await client.graphql({ query: listExpensesQuery });
      const items = expenseData.data.listExpenses.items || [];
      const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
      setFetchError(false);

      if (isManualRefresh) {
        addToast('Expenses refreshed successfully.', 'success');
      }
    } catch (err) {
      console.error('Error fetching expenses from GraphQL:', err);
      setFetchError(true);

      // Silently seed mock data only on the very first load so the UI is never blank
      if (!hasFetchedOnce.current) {
        const mockData = [
          { id: '1', date: '2026-04-18', merchant: 'Amazon Web Services', amount: 84.5 },
          { id: '2', date: '2026-04-16', merchant: 'Uber Rides', amount: 24.0 },
          { id: '3', date: '2026-04-12', merchant: 'Local Coffee Shop', amount: 6.25 },
        ];
        setExpenses(mockData.sort((a, b) => new Date(b.date) - new Date(a.date)));
        addToast('Could not reach the API — showing demo data.', 'error');
      } else {
        addToast('Failed to refresh expenses. Please try again.', 'error');
      }
    } finally {
      hasFetchedOnce.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Recent Expenses</h3>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Fetching your receipts…' : `${expenses.length} receipts found`}
            </p>
          </div>

          <button
            onClick={() => fetchExpenses({ isManualRefresh: true })}
            disabled={loading || isRefreshing}
            title="Refresh expenses"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={15}
              className={`${isRefreshing ? 'animate-spin text-indigo-500' : ''}`}
            />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Table / States */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap table-auto">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">Date</th>
                <th scope="col" className="px-6 py-3.5">Merchant</th>
                <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Skeleton rows during initial load
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Inbox size={40} className="mb-3 opacity-50" />
                      <p className="font-medium text-gray-500">No expenses yet</p>
                      <p className="text-xs mt-1">Upload a receipt to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className={`transition-colors ${
                      isRefreshing ? 'opacity-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(expense.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{expense.merchant}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      ${Number(expense.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer total row */}
        {!loading && expenses.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total</span>
            <span className="text-sm font-bold text-indigo-700">${totalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Toast Stack */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
