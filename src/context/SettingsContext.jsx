import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { listExpenses } from '../api';
import { mockApi } from '../api';

// ── Currency metadata ─────────────────────────────────────────────────
export const CURRENCIES = {
  USD: { symbol: '$',  locale: 'en-US',  flag: '🇺🇸', label: 'US Dollar'        },
  EUR: { symbol: '€',  locale: 'de-DE',  flag: '🇪🇺', label: 'Euro'              },
  GBP: { symbol: '£',  locale: 'en-GB',  flag: '🇬🇧', label: 'British Pound'     },
  INR: { symbol: '₹',  locale: 'en-IN',  flag: '🇮🇳', label: 'Indian Rupee'      },
  CAD: { symbol: 'CA$',locale: 'en-CA',  flag: '🇨🇦', label: 'Canadian Dollar'   },
  AUD: { symbol: 'A$', locale: 'en-AU',  flag: '🇦🇺', label: 'Australian Dollar' },
};

// ── Defaults ──────────────────────────────────────────────────────────
const DEFAULTS = {
  theme:           'light',  // 'light' | 'dark' | 'system'
  currency:        'USD',
  compactView:     false,
  autoRefresh:     true,
  uploadAlerts:    true,
  monthlySummary:  true,
  spendingAlert:   false,
};

function loadSettings() {
  try {
    const stored = localStorage.getItem('expense-tracker-settings');
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem('expense-tracker-settings', JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ── Theme applicator ──────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

// ── Format amount with currency ───────────────────────────────────────
export function formatAmount(amount, currencyCode) {
  const meta = CURRENCIES[currencyCode] || CURRENCIES.USD;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${meta.symbol}${Number(amount).toFixed(2)}`;
  }
}

// ── Export CSV helper ─────────────────────────────────────────────────
export async function exportExpensesCSV(currency) {
  let items = [];
  try {
    const result = await listExpenses();
    items = result.items || [];
  } catch {
    try {
      const result = await mockApi.listExpenses();
      items = result.items || [];
    } catch { /* nothing to export */ }
  }

  if (items.length === 0) {
    alert('No expenses to export.');
    return;
  }

  const meta = CURRENCIES[currency] || CURRENCIES.USD;
  const header = ['Date', 'Merchant', 'Category', `Amount (${currency})`, 'ID'];
  const rows = items.map(e => [
    e.date || '',
    `"${(e.merchant || '').replace(/"/g, '""')}"`,
    e.category || 'Other',
    Number(e.amount).toFixed(2),
    e.id || '',
  ]);

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Context ───────────────────────────────────────────────────────────
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(loadSettings);

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    applyTheme(settings.theme);

    // Listen for system theme changes when 'system' is selected
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (settings.theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSettings = useCallback((partial) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      if (partial.theme !== undefined) applyTheme(partial.theme);
      return next;
    });
  }, []);

  const value = {
    settings,
    updateSettings,
    currency: settings.currency,
    theme:    settings.theme,
    fmt: (amount) => formatAmount(amount, settings.currency),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
