import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';
import { SettingsProvider } from './context/SettingsContext';
import { LogOut, User } from 'lucide-react';

Amplify.configure(awsExports);

function App() {
  return (
    <SettingsProvider>
      <Authenticator>
        {({ signOut, user }) => (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans relative transition-colors duration-300">
            {/* ─── Top Navigation Bar ────────────────────────────── */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  {/* Logo + Brand */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 transition-transform hover:scale-105">
                      <span className="text-white font-bold text-base tracking-tight">E</span>
                    </div>
                    <div className="hidden sm:block">
                      <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                        Expense Tracker
                      </h1>
                      <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                        AI-Powered
                      </p>
                    </div>
                  </div>

                  {/* Right Side — User Info + Sign Out */}
                  <div className="flex items-center gap-3">
                    {/* User Badge */}
                    <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3.5 py-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <User size={14} className="text-indigo-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[140px] truncate">
                        {user?.username}
                      </span>
                    </div>

                    {/* Sign Out Button */}
                    <button
                      onClick={signOut}
                      id="sign-out-button"
                      className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                                 bg-gray-900 dark:bg-gray-700 text-white
                                 hover:bg-gray-800 dark:hover:bg-gray-600
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900
                                 shadow-sm transition-all duration-150 active:scale-[0.97]"
                    >
                      <LogOut size={15} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* ─── Main Layout ───────────────────────────────────── */}
            <Dashboard />

            {/* ─── Floating Chat Widget ──────────────────────────── */}
            <ChatWidget />
          </div>
        )}
      </Authenticator>
    </SettingsProvider>
  );
}

export default App;
