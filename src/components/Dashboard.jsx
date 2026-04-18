import React from 'react';
import ReceiptUploader from './ReceiptUploader';
import ExpenseList from './ExpenseList';
import {
  LayoutDashboard,
  FileText,
  Settings,
  BarChart2,
  TrendingUp,
  Receipt,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

// ─── Stat Card Sub-component ─────────────────────────
function StatCard({ icon: Icon, label, value, trend, color }) {
  const colors = {
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      trendColor: 'text-indigo-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      trendColor: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      trendColor: 'text-amber-600',
    },
  };
  const c = colors[color] || colors.indigo;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon size={20} className={c.iconColor} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${c.trendColor} ${c.bg} px-2 py-0.5 rounded-full`}>
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

// ─── Nav Link Sub-component ──────────────────────────
function NavLink({ icon: Icon, label, active = false }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150
        ${
          active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
    >
      <Icon size={18} className={active ? 'text-indigo-200' : ''} />
      {label}
    </a>
  );
}

// ─── Main Dashboard ──────────────────────────────────
export default function Dashboard() {
  return (
    <div className="flex flex-1 w-full overflow-hidden">
      {/* ──── Sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-gray-200/60 flex-col shrink-0">
        <div className="p-5 h-full flex flex-col">
          {/* Nav Heading */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 px-4">
            Menu
          </p>
          <nav className="space-y-1 flex-1">
            <NavLink icon={LayoutDashboard} label="Overview" active />
            <NavLink icon={FileText} label="Receipts" />
            <NavLink icon={BarChart2} label="Analytics" />
            <NavLink icon={Settings} label="Settings" />
          </nav>

          {/* Upgrade CTA */}
          <div className="mt-auto pt-5 border-t border-gray-100">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
              {/* Decorative blur */}
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
                  className="w-full bg-white text-indigo-700 rounded-xl py-2.5 text-sm font-bold
                             hover:bg-indigo-50 transition-colors shadow-sm active:scale-[0.97]"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ──── Main Content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-7 sm:p-10 text-white shadow-xl shadow-indigo-500/15">
            <div className="relative z-10">
              <p className="text-indigo-200 text-sm font-semibold mb-1 tracking-wide uppercase">Dashboard</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">
                Welcome back! 👋
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg max-w-lg">
                Let's get those expenses tracked and sorted. Upload a receipt to get started.
              </p>
            </div>
            {/* Decorative shapes */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl" />
            <div className="absolute right-8 bottom-6 w-24 h-24 border border-white/10 rounded-2xl rotate-12 hidden sm:block" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Receipt} label="Total Receipts" value="12" trend="+3" color="indigo" />
            <StatCard icon={TrendingUp} label="This Month" value="$482.50" trend="+12%" color="emerald" />
            <StatCard icon={BarChart2} label="Avg. Expense" value="$40.21" color="amber" />
          </div>

          {/* Upload + Expenses Grid */}
          <div className="grid grid-cols-1 gap-8">
            <section>
              <ReceiptUploader />
            </section>
            <section>
              <ExpenseList />
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}
