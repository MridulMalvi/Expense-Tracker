import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';

Amplify.configure(awsExports);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative pb-20 sm:pb-0">
          {/* Header */}
          <header className="bg-white shadow z-10 relative">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">Expense Tracker</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 hidden sm:block">
                  {user?.username}
                </span>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 text-sm font-semibold rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          {/* Render the Dashboard component */}
          <Dashboard />

          {/* Render the Floating Chatbot Widget securely within the Auth Context */}
          <ChatWidget />
        </div>
      )}
    </Authenticator>
  );
}

export default App;
