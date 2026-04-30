import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, CheckCircle, X, Inbox, ListFilter,
  PlusCircle, Pencil, Save, Loader2, Trash2, WifiOff,
} from 'lucide-react';
import {
  listExpenses, createExpense, updateExpense, deleteExpense,
  mockApi,
} from '../api';
import awsExports from '../aws-exports';
import { useSettings } from '../context/SettingsContext';

// ─── Try real Lambda, fall back to mock on error ──────────────
const api = {
  list:   async () => { try { return await listExpenses(); } catch { return mockApi.listExpenses(); } },
  create: async (d) => { try { return await createExpense(d); } catch { return mockApi.createExpense(d); } },
  update: async (id, d) => { try { return await updateExpense(id, d); } catch { return mockApi.updateExpense(id, d); } },
  delete: async (id) => { try { return await deleteExpense(id); } catch { return mockApi.deleteExpense(id); } },
};

// ─── API config check ─────────────────────────────────────────
const _isApiConfigured = !!(awsExports && awsExports.aws_user_pools_id);
function isApiConfigured() { return _isApiConfigured; }

// ─── Categories ───────────────────────────────────────────────
const CATEGORY_STYLES = {
  Food:     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  Travel:   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  Shopping: { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  Health:   { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  Bills:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  Other:    { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
};
const CATEGORIES = Object.keys(CATEGORY_STYLES);

function CategoryBadge({ category }) {
  const cat = category || 'Other';
  const s = CATEGORY_STYLES[cat] || CATEGORY_STYLES.Other;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {cat}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:bottom-6 z-[100] flex flex-col gap-3 pointer-events-none w-[90vw] sm:w-auto sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-medium backdrop-blur-sm animate-fade-in-up w-full ${
            t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800'
            : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {t.type === 'success'
            ? <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
            : t.type === 'warning'
            ? <WifiOff size={18} className="text-amber-500 shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          }
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded-lg animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
      <td className="px-6 py-4"><div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" /></td>
    </tr>
  );
}

// ─── Expense Modal ────────────────────────────────────────────
function ExpenseModal({ mode, expense, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date:     expense?.date     ?? today,
    merchant: expense?.merchant ?? '',
    amount:   expense?.amount   ?? '',
    category: expense?.category ?? 'Other',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.date)                                    e.date     = 'Date is required';
    if (!form.merchant.trim())                         e.merchant = 'Merchant name is required';
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) e.amount = 'Enter a valid positive amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) });
    setSaving(false);
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-gray-900
          focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition
          ${errors[key] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
        {...extra}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'add' ? 'bg-indigo-50' : 'bg-amber-50'}`}>
              {mode === 'add' ? <PlusCircle size={18} className="text-indigo-600" /> : <Pencil size={18} className="text-amber-600" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{mode === 'add' ? 'Add Expense' : 'Edit Expense'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {field('Date', 'date', 'date')}
          {field('Merchant / Store', 'merchant', 'text', { placeholder: 'e.g. Amazon, Starbucks' })}
          {field('Amount (USD)', 'amount', 'number', { placeholder: '0.00', step: '0.01', min: '0.01' })}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition hover:border-gray-300"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors active:scale-[0.97]">
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : mode === 'add' ? 'Add Expense' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ExpenseList() {
  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts]             = useState([]);
  const [modal, setModal]               = useState(null);
  const hasFetchedOnce                  = useRef(false);

  // ── Toast helpers ──────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => dismissToast(id), 6000);
  }, [dismissToast]);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchExpenses = useCallback(async ({ isManualRefresh = false } = {}) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const result = await api.list();
      const items = result.items || [];
      setExpenses([...items].sort((a, b) => new Date(b.date) - new Date(a.date)));
      if (isManualRefresh) addToast('Expenses refreshed successfully.', 'success');
    } catch (err) {
      console.error('[ExpenseList] Fetch error:', err);
      addToast(`Failed to load expenses: ${err.message}`, 'error');
    } finally {
      hasFetchedOnce.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Save (create / update) ─────────────────────────────────
  const handleSave = async (formData) => {
    const isEdit = modal?.mode === 'edit';
    try {
      if (isEdit) {
        const updated = await api.update(modal.expense.id, formData);
        setExpenses(prev =>
          prev.map(e => e.id === updated.id ? updated : e)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
        );
        addToast('Expense updated successfully.', 'success');
      } else {
        const created = await api.create(formData);
        setExpenses(prev =>
          [created, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
        );
        addToast('Expense added successfully.', 'success');
      }
    } catch (err) {
      console.error('[ExpenseList] Save error:', err);
      addToast(`Failed to save: ${err.message}`, 'error');
    }
    setModal(null);
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete "${expense.merchant}"? This cannot be undone.`)) return;
    try {
      await api.delete(expense.id);
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      addToast('Expense deleted.', 'success');
    } catch (err) {
      addToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const { fmt } = useSettings();

  return (
    <>
      {modal && (
        <ExpenseModal
          mode={modal.mode}
          expense={modal.expense}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ListFilter size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Expenses</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {loading ? 'Fetching your receipts…' : `${expenses.length} receipts found`}
                {!isApiConfigured() && (
                  <span className="ml-2 text-amber-500 font-semibold">• Demo Mode</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              id="add-expense-button"
              onClick={() => setModal({ mode: 'add' })}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              <PlusCircle size={15} />
              <span>Add Manually</span>
            </button>

            <button
              id="refresh-expenses-button"
              onClick={() => fetchExpenses({ isManualRefresh: true })}
              disabled={loading || isRefreshing}
              title="Refresh expenses"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Merchant</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <Inbox size={28} className="opacity-50" />
                      </div>
                      <p className="font-semibold text-gray-500 text-sm">No expenses yet</p>
                      <p className="text-xs mt-1 text-gray-400">Upload a receipt or add one manually</p>
                      <button
                        onClick={() => setModal({ mode: 'add' })}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-[0.97]"
                      >
                        <PlusCircle size={15} /> Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense, idx) => (
                  <tr
                    key={expense.id}
                    className={`transition-all duration-150 group ${isRefreshing ? 'opacity-40' : 'hover:bg-gray-50/80'}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {new Date(expense.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-indigo-600">
                            {expense.merchant?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">{expense.merchant}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={expense.category} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm">
                        {fmt(expense.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`edit-expense-${expense.id}`}
                          onClick={() => setModal({ mode: 'edit', expense })}
                          title="Edit expense"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all duration-150 active:scale-[0.93]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-expense-${expense.id}`}
                          onClick={() => handleDelete(expense)}
                          title="Delete expense"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150 active:scale-[0.93]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer total */}
        {!loading && expenses.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Total</span>
            <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
              {fmt(totalAmount)}
            </span>
          </div>
        )}
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
