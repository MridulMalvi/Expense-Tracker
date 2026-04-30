import React, { useState } from 'react';
import ReceiptUploader from './ReceiptUploader';
import ExpenseList from './ExpenseList';
import { useSettings, CURRENCIES, exportExpensesCSV } from '../context/SettingsContext';
import {
  LayoutDashboard, FileText, Settings, BarChart2, TrendingUp, Receipt,
  Zap, ArrowUpRight, ImagePlus, PieChart, Bell, Shield, Palette,
  CreditCard, Download, CheckCircle2, Info, ChevronRight, Sun, Moon, Monitor,
} from 'lucide-react';

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, trend, color }) {
  const colors = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/30',   iconBg: 'bg-indigo-100 dark:bg-indigo-800',   iconColor: 'text-indigo-600 dark:text-indigo-400',  trendColor: 'text-indigo-600 dark:text-indigo-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconBg: 'bg-emerald-100 dark:bg-emerald-800', iconColor: 'text-emerald-600 dark:text-emerald-400', trendColor: 'text-emerald-600 dark:text-emerald-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/30',     iconBg: 'bg-amber-100 dark:bg-amber-800',     iconColor: 'text-amber-600 dark:text-amber-400',    trendColor: 'text-amber-600 dark:text-amber-300' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon size={20} className={c.iconColor} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${c.trendColor} ${c.bg} px-2 py-0.5 rounded-full`}>
            <ArrowUpRight size={12} />{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

// ─── Nav Link ────────────────────────────────────────────────
function NavLink({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      id={`nav-${label.toLowerCase()}`}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left
        ${active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/60'
        }`}
    >
      <Icon size={18} className={active ? 'text-indigo-200' : ''} />
      {label}
    </button>
  );
}

// ─── Analytics Bar ───────────────────────────────────────────
function AnalyticsBar({ label, amount, max, color }) {
  const { fmt } = useSettings();
  const pct = max > 0 ? (amount / max) * 100 : 0;
  const colors = {
    indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
    rose: 'bg-rose-500', sky: 'bg-sky-500', purple: 'bg-purple-500',
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-bold text-gray-900 dark:text-white">{fmt(amount)}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[color] || colors.indigo} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Toggle Row ──────────────────────────────────────────────
function ToggleRow({ label, description, settingKey }) {
  const { settings, updateSettings } = useSettings();
  const on = settings[settingKey] ?? false;
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => updateSettings({ [settingKey]: !on })}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          ${on ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
            ${on ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

// ─── Views ───────────────────────────────────────────────────

function OverviewView() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-7 sm:p-10 text-white shadow-xl shadow-indigo-500/15">
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-semibold mb-1 tracking-wide uppercase">Dashboard</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">Welcome back! 👋</h2>
          <p className="text-indigo-100 text-base sm:text-lg max-w-lg">
            Let's get those expenses tracked and sorted. Upload a receipt to get started.
          </p>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Receipt}    label="Total Receipts" value="12"      trend="+3"   color="indigo" />
        <StatCard icon={TrendingUp} label="This Month"     value="$482.50" trend="+12%" color="emerald" />
        <StatCard icon={BarChart2}  label="Avg. Expense"   value="$40.21"               color="amber" />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <section><ReceiptUploader /></section>
        <section><ExpenseList /></section>
      </div>
    </div>
  );
}

function ReceiptsView() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
          <ImagePlus size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receipts</h2>
          <p className="text-sm text-gray-400 font-medium">Upload and manage your receipt images</p>
        </div>
      </div>
      <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700 rounded-xl px-4 py-3">
        <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
          Uploaded receipts are processed by AWS Textract — amounts and merchants are extracted automatically.
        </p>
      </div>
      <ReceiptUploader />
      <ExpenseList />
    </div>
  );
}

function AnalyticsView() {
  const categories = [
    { label: 'Food & Dining',     amount: 142.75, color: 'amber'   },
    { label: 'Travel',            amount: 98.00,  color: 'sky'     },
    { label: 'Shopping',          amount: 214.50, color: 'purple'  },
    { label: 'Health',            amount: 55.00,  color: 'rose'    },
    { label: 'Bills & Utilities', amount: 185.20, color: 'indigo'  },
    { label: 'Other',             amount: 36.30,  color: 'emerald' },
  ];
  const maxVal = Math.max(...categories.map(c => c.amount));
  const total  = categories.reduce((s, c) => s + c.amount, 0);
  const { fmt } = useSettings();

  const months = [
    { m: 'Jan', v: 310 }, { m: 'Feb', v: 280 }, { m: 'Mar', v: 420 },
    { m: 'Apr', v: 390 }, { m: 'May', v: 511 }, { m: 'Jun', v: 448 },
    { m: 'Jul', v: 365 }, { m: 'Aug', v: 490 }, { m: 'Sep', v: 530 },
    { m: 'Oct', v: 475 }, { m: 'Nov', v: 610 }, { m: 'Dec', v: 580 },
  ];
  const maxBar = Math.max(...months.map(m => m.v));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
          <PieChart size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          <p className="text-sm text-gray-400 font-medium">Spending breakdown and monthly trends</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Receipt}    label="Total Spent"      value={fmt(total)} color="indigo" />
        <StatCard icon={TrendingUp} label="Highest Category" value="Shopping"   color="purple" />
        <StatCard icon={BarChart2}  label="Peak Month"       value="December"   color="emerald" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Spending by Category</h3>
        <div className="space-y-4">
          {categories.map(c => (
            <AnalyticsBar key={c.label} label={c.label} amount={c.amount} max={maxVal} color={c.color} />
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Monthly Spending — 2026</h3>
        <div className="flex items-end gap-2 h-40">
          {months.map(({ m, v }) => {
            const pct = (v / maxBar) * 100;
            const isThisMonth = m === 'Apr';
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {fmt(v)}
                </span>
                <div
                  title={`${m}: ${fmt(v)}`}
                  className={`w-full rounded-t-lg transition-all duration-300 ${isThisMonth ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600 group-hover:bg-indigo-300'}`}
                  style={{ height: `${pct}%` }}
                />
                <span className={`text-[10px] font-semibold ${isThisMonth ? 'text-indigo-600' : 'text-gray-400'}`}>{m}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Hover over a bar to see amount · Current month highlighted in indigo</p>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────
function SettingsView() {
  const { settings, updateSettings, currency } = useSettings();
  const [saved, setSaved]     = useState(false);
  const [exporting, setExporting] = useState(false);

  const THEME_OPTIONS = [
    { value: 'light',  label: 'Light',  Icon: Sun     },
    { value: 'dark',   label: 'Dark',   Icon: Moon    },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportExpensesCSV(currency);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Settings size={20} className="text-gray-600 dark:text-gray-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-sm text-gray-400 font-medium">Manage your account and preferences</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Preferences</h3>
        </div>

        {/* Currency */}
        <div className="py-4 border-b border-gray-50 dark:border-gray-700/50">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Default Currency</label>
          <p className="text-xs text-gray-400 mb-3">Used for all expense amounts and exports</p>
          <select
            value={settings.currency}
            onChange={e => updateSettings({ currency: e.target.value })}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          >
            {Object.entries(CURRENCIES).map(([code, { flag, label }]) => (
              <option key={code} value={code}>{flag} {code} — {label}</option>
            ))}
          </select>
          <p className="text-[11px] text-indigo-500 mt-2 font-medium">
            ✓ Currency updates instantly across all views
          </p>
        </div>

        {/* Theme */}
        <div className="py-4 border-b border-gray-50 dark:border-gray-700/50">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Theme</label>
          <p className="text-xs text-gray-400 mb-3">Choose your display mode</p>
          <div className="flex gap-3">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => updateSettings({ theme: value })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all
                  ${settings.theme === value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-indigo-500 mt-2 font-medium">
            ✓ Theme applies immediately to the entire app
          </p>
        </div>

        <ToggleRow label="Compact View"  description="Show more rows with reduced padding"     settingKey="compactView" />
        <ToggleRow label="Auto-refresh"  description="Refresh expense list every 5 minutes"    settingKey="autoRefresh" />
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h3>
        </div>
        <ToggleRow label="Upload Alerts"      description="Notify when a receipt is processed"      settingKey="uploadAlerts" />
        <ToggleRow label="Monthly Summary"    description="Email summary of spending each month"     settingKey="monthlySummary" />
        <ToggleRow label="Spending Threshold" description="Alert when you exceed your budget goal"   settingKey="spendingAlert" />
      </div>

      {/* Data & Privacy */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Data &amp; Privacy</h3>
        </div>
        <div className="space-y-3">
          {/* Export CSV — fully functional */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700
              hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-150 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Download size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {exporting ? 'Exporting…' : `Export all expenses as CSV (${settings.currency})`}
              </span>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700
            hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-150 group">
            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Manage billing &amp; subscription</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 group">
            <span className="text-sm font-semibold text-red-500">Delete all my data</span>
            <ChevronRight size={16} className="text-red-300 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97]
            ${saved
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20'
            }`}
        >
          {saved ? <CheckCircle2 size={16} /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
const VIEWS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard, view: OverviewView  },
  { id: 'receipts',  label: 'Receipts',  icon: FileText,        view: ReceiptsView  },
  { id: 'analytics', label: 'Analytics', icon: BarChart2,        view: AnalyticsView },
  { id: 'settings',  label: 'Settings',  icon: Settings,        view: SettingsView  },
];

export default function Dashboard() {
  const [activeId, setActiveId] = useState('overview');
  const ActiveView = VIEWS.find(v => v.id === activeId)?.view ?? OverviewView;

  return (
    <div className="flex flex-1 w-full overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[260px] bg-white dark:bg-gray-900 border-r border-gray-200/60 dark:border-gray-700/60 flex-col shrink-0">
        <div className="p-5 h-full flex flex-col">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 px-4">Menu</p>
          <nav className="space-y-1 flex-1">
            {VIEWS.map(({ id, label, icon }) => (
              <NavLink key={id} icon={icon} label={label} active={activeId === id} onClick={() => setActiveId(id)} />
            ))}
          </nav>
          {/* Upgrade CTA */}
          <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-700">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-amber-300" />
                  <p className="font-bold text-sm">Go Pro</p>
                </div>
                <p className="text-indigo-100 text-xs leading-relaxed mb-4">
                  Unlimited receipts, AI analytics, and priority support.
                </p>
                <button
                  id="upgrade-button"
                  className="w-full bg-white text-indigo-700 rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm active:scale-[0.97]"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Tab Bar ───────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 flex">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`mobile-nav-${id}`}
            onClick={() => setActiveId(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wide transition-colors
              ${activeId === id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ActiveView />
        </div>
      </main>
    </div>
  );
}
