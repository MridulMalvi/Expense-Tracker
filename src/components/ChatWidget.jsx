import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, TrendingUp, Receipt } from 'lucide-react';
import { listExpenses, mockApi } from '../api';
import { fetchAuthSession } from 'aws-amplify/auth';

// ─── Fetch expenses (real API → mock fallback) ────────────────
async function getExpenses() {
  try {
    const result = await listExpenses();
    return result.items || [];
  } catch {
    const result = await mockApi.listExpenses();
    return result.items || [];
  }
}

// ─── Smart local NLU ─────────────────────────────────────────
const CATEGORIES = ['food', 'travel', 'shopping', 'health', 'bills', 'other'];

function matchCategory(text) {
  const t = text.toLowerCase();
  // Map common phrases → category keys
  const aliases = {
    food:     ['food', 'restaurant', 'dining', 'eat', 'coffee', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy'],
    travel:   ['travel', 'uber', 'cab', 'flight', 'trip', 'transport', 'taxi', 'ola'],
    shopping: ['shopping', 'amazon', 'shop', 'purchase', 'buy'],
    health:   ['health', 'medical', 'doctor', 'pharmacy', 'medicine', 'hospital'],
    bills:    ['bill', 'bills', 'utility', 'utilities', 'netflix', 'aws', 'subscription', 'recharge'],
    other:    ['other', 'misc', 'miscellaneous'],
  };
  for (const [cat, words] of Object.entries(aliases)) {
    if (words.some(w => t.includes(w))) return cat;
  }
  return null;
}

function fmt(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function fmtMonth(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function currentMonthExpenses(expenses) {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function processQuery(text, expenses) {
  const q = text.toLowerCase();

  // ── Total / overall spent ────────────────────────────────
  if (/\b(total|overall|all|everything|sum)\b/.test(q) && !/category|categor/.test(q)) {
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return `Your total spending across all ${expenses.length} expenses is **${fmt(total)}**.`;
  }

  // ── This month ───────────────────────────────────────────
  if (/\b(this month|current month|month)\b/.test(q)) {
    const month = currentMonthExpenses(expenses);
    if (!month.length) return "You have no expenses recorded for this month yet.";
    const total = month.reduce((s, e) => s + Number(e.amount), 0);
    const cat = matchCategory(q);
    if (cat) {
      const filtered = month.filter(e => (e.category || 'other').toLowerCase() === cat);
      const catTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);
      return filtered.length
        ? `This month you spent **${fmt(catTotal)}** on ${cat} across ${filtered.length} transaction(s).`
        : `No ${cat} expenses found for this month.`;
    }
    return `This month you've spent **${fmt(total)}** across ${month.length} expense(s).`;
  }

  // ── Category spend ───────────────────────────────────────
  const cat = matchCategory(q);
  if (cat && /\b(spend|spent|cost|much|paid|pay)\b/.test(q)) {
    const filtered = expenses.filter(e => (e.category || 'other').toLowerCase() === cat);
    if (!filtered.length) return `You have no expenses in the **${cat}** category yet.`;
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
    const latest = filtered.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return `You've spent **${fmt(total)}** on **${cat}** across ${filtered.length} transaction(s). The most recent was **${latest.merchant}** on ${new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`;
  }

  // ── Biggest / largest expense ────────────────────────────
  if (/\b(biggest|largest|most|highest|expensive|max)\b/.test(q)) {
    if (!expenses.length) return "No expenses recorded yet.";
    const top = expenses.reduce((a, b) => Number(a.amount) > Number(b.amount) ? a : b);
    return `Your biggest expense is **${top.merchant}** — **${fmt(top.amount)}** on ${fmtMonth(top.date)}.`;
  }

  // ── Recent / latest ──────────────────────────────────────
  if (/\b(recent|latest|last|newest)\b/.test(q)) {
    const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    if (!recent.length) return "No expenses found yet.";
    const list = recent.map(e => `• **${e.merchant}** — ${fmt(e.amount)}`).join('\n');
    return `Your 3 most recent expenses:\n${list}`;
  }

  // ── Count / how many ─────────────────────────────────────
  if (/\b(how many|count|number of)\b/.test(q)) {
    const cat2 = matchCategory(q);
    if (cat2) {
      const n = expenses.filter(e => (e.category || 'other').toLowerCase() === cat2).length;
      return `You have **${n}** expense(s) in the **${cat2}** category.`;
    }
    return `You have **${expenses.length}** expense(s) recorded in total.`;
  }

  // ── Average ──────────────────────────────────────────────
  if (/\b(average|avg|mean)\b/.test(q)) {
    if (!expenses.length) return "No expenses to average yet.";
    const avg = expenses.reduce((s, e) => s + Number(e.amount), 0) / expenses.length;
    return `Your average expense is **${fmt(avg)}** across ${expenses.length} transactions.`;
  }

  // ── Breakdown by category ────────────────────────────────
  if (/\b(breakdown|categories|category|split|by category)\b/.test(q)) {
    const totals = {};
    for (const e of expenses) {
      const c = (e.category || 'Other');
      totals[c] = (totals[c] || 0) + Number(e.amount);
    }
    if (!Object.keys(totals).length) return "No expenses recorded yet.";
    const lines = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `• **${c}**: ${fmt(v)}`).join('\n');
    return `Here's your spending breakdown:\n${lines}`;
  }

  // ── Help ─────────────────────────────────────────────────
  if (/\b(help|what can|what do|commands|hi|hello|hey)\b/.test(q)) {
    return `Hi! 👋 I can answer questions like:\n• "How much did I spend on food?"\n• "What's my total spending?"\n• "Show this month's expenses"\n• "What's my biggest expense?"\n• "Give me a category breakdown"\n• "How many travel expenses do I have?"`;
  }

  // ── Fallback ─────────────────────────────────────────────
  return `I didn't quite understand that. Try asking:\n• "How much did I spend on food?"\n• "What's my total spending this month?"\n• "Show my biggest expense"\n• "Category breakdown"`;
}

// ─── Suggestion Chips ─────────────────────────────────────────
const SUGGESTIONS = [
  'Total spending',
  'This month',
  'Category breakdown',
  'Biggest expense',
  'Food spending',
  'Recent expenses',
];

// ─── Message renderer (supports **bold** markdown) ────────────
function MessageText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : p.split('\n').map((line, j, arr) => (
              <React.Fragment key={`${i}-${j}`}>
                {line}{j < arr.length - 1 && <br />}
              </React.Fragment>
            ))
      )}
    </span>
  );
}

// ─── Main ChatWidget ──────────────────────────────────────────
export default function ChatWidget() {
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi! 👋 I\'m your Expense Assistant. Ask me anything about your spending — like "How much did I spend on food?" or "Show category breakdown".' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [expenses, setExpenses]   = useState([]);
  const messagesEndRef = useRef(null);

  // Load expenses once when first opened
  useEffect(() => {
    if (isOpen && expenses.length === 0) {
      getExpenses().then(setExpenses).catch(() => {});
    }
  }, [isOpen, expenses.length]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const addMessage = useCallback((type, text) => {
    setMessages(prev => [...prev, { type, text }]);
  }, []);

  const handleSend = async (text) => {
    const msg = (text || inputText).trim();
    if (!msg) return;
    setInputText('');
    addMessage('user', msg);
    setIsTyping(true);

    // Refresh expenses on each query for freshness
    let freshExpenses = expenses;
    try {
      freshExpenses = await getExpenses();
      setExpenses(freshExpenses);
    } catch { /* use cached */ }

    // Simulate a tiny processing delay for realism
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    const answer = processQuery(msg, freshExpenses);
    addMessage('bot', answer);
    setIsTyping(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto bg-white border border-gray-200/60 shadow-2xl rounded-3xl w-80 sm:w-96 flex flex-col overflow-hidden mb-4 animate-fade-in-up">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white_1px,transparent_1px)] bg-[length:16px_16px]" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-wide">Expense Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-indigo-100 text-[11px] font-medium">AI-Powered · Always Online</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative z-10 text-white/70 hover:text-white hover:bg-white/15 p-2 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 px-4 py-4 overflow-y-auto bg-gray-50/40 flex flex-col gap-3 min-h-[280px] max-h-[380px]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                    <Bot size={14} className="text-indigo-600" />
                  </div>
                )}
                <div className={`px-4 py-2.5 text-sm leading-relaxed max-w-[80%] ${
                  msg.type === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-sm shadow-indigo-500/10'
                    : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm'
                }`}>
                  <MessageText text={msg.text} />
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center mr-2 shrink-0">
                  <Bot size={14} className="text-indigo-600" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length <= 2 && !isTyping && (
            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5 bg-white border-t border-gray-50">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleFormSubmit}
            className="border-t border-gray-100 bg-white p-3 flex gap-2.5 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask about your spending…"
              className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="bg-indigo-600 text-white h-11 w-11 rounded-xl flex justify-center items-center
                         hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.93] flex-shrink-0"
            >
              <Send size={17} className="translate-x-[1px]" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        id="chat-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-gradient-to-tr from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/25
                   hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105
                   transition-all duration-300 flex items-center justify-center relative group
                   active:scale-95"
      >
        {isOpen ? <X size={26} className="text-white" /> : <MessageSquare size={26} className="text-white" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 border-2 border-white" />
          </span>
        )}
      </button>
    </div>
  );
}
