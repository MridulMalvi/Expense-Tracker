import React from 'react';
import ReceiptUploader from './ReceiptUploader';
import ExpenseList from './ExpenseList';
import { LayoutDashboard, FileText, Settings, BarChart2 } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex flex-1 w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden sm:flex">
        <div className="p-6 h-full flex flex-col">
          <nav className="space-y-2 flex-1 mt-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-indigo-700 bg-indigo-50 rounded-lg font-semibold transition-colors">
              <LayoutDashboard size={20} />
              Overview
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
              <FileText size={20} />
              Receipts
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
              <BarChart2 size={20} />
              Analytics
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
              <Settings size={20} />
              Settings
            </a>
          </nav>
          
          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 text-sm shadow-sm">
              <p className="font-bold text-indigo-900 mb-1">Pro Account</p>
              <p className="text-indigo-600 mb-4 text-xs">Unlock unlimited scanned receipts & reports.</p>
              <button className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 transition shadow-sm">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 sm:p-10 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Welcome back! 👋</h2>
              <p className="text-indigo-100 text-lg">Let's get those expenses tracked and sorted.</p>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>
          </div>
          
          {/* Main Dashboard Layout */}
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
