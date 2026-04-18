import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';
import awsconfig from '../aws-exports'; // Import to dynamically grab project region

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi! I am your expense assistant. Ask me questions like "How much did I spend on food?"' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Replace these placeholders with your actual Lex V2 configuration constants!
  const BOT_ID = 'YOUR_LEX_BOT_ID';
  const BOT_ALIAS_ID = 'YOUR_ALIAS_ID';
  const LOCALE_ID = 'en_US';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Fetch AWS credentials securely via Amplify Auth Session (since Interaction is deprecated in v6)
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error("No AWS Credentials available");

      // 2. Initialize vanilla AWS SDK LexClient using the authenticated user's Cognito credentials securely 
      const lexClient = new LexRuntimeV2Client({
        region: awsconfig.aws_project_region || 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // 3. Send text payload directly to Lex V2 Runtime
      const command = new RecognizeTextCommand({
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: LOCALE_ID,
        sessionId: 'expense-tracker-webapp-session',
        text: userMessage
      });

      const response = await lexClient.send(command);
      
      const lexMessages = response.messages;
      if (lexMessages && lexMessages.length > 0) {
        lexMessages.forEach(msg => {
          setMessages(prev => [...prev, { type: 'bot', text: msg.content }]);
        });
      } else {
        setMessages(prev => [...prev, { type: 'bot', text: 'I am not sure how to respond to that.' }]);
      }
    } catch (error) {
      console.error('Error communicating with Amazon Lex:', error);
      setMessages(prev => [...prev, { type: 'bot', text: 'Oops! I had trouble connecting to the Lex server. Make sure your bot is deployed and the IDs match.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto bg-white border border-gray-100 shadow-2xl rounded-3xl w-80 sm:w-96 flex flex-col overflow-hidden mb-5 transition-all duration-300 ease-in-out transform origin-bottom-right">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 flex justify-between to-purple-600 p-4 text-white items-center shadow-sm z-10">
            <div className="flex items-center gap-2.5">
              <Bot size={24} className="text-indigo-100 bg-white/20 p-1 rounded-full w-8 h-8 flex justify-center items-center" />
              <div>
                <h3 className="font-semibold text-lg leading-tight tracking-wide">Expense Bot</h3>
                <p className="text-indigo-100 text-xs">Powered by Amazon Lex</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-indigo-100 opacity-80 hover:opacity-100 hover:bg-white/20 p-1.5 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50/50 flex flex-col gap-4 min-h-[300px] max-h-[400px]">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-1 max-w-[85%] ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                    msg.type === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            className="border-t border-gray-100 bg-white p-3 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="bg-indigo-600 text-white h-11 w-11 rounded-full flex justify-center items-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
            >
              <Send size={18} className="translate-x-[1px]" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-gradient-to-tr from-indigo-600 to-purple-600 p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center relative group"
      >
        {isOpen ? <X size={28} className="text-white" /> : <MessageSquare size={28} className="text-white" />}
        {!isOpen && (
           <span className="absolute -top-1 -right-1 flex h-4 w-4">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 border-2 border-white"></span>
           </span>
        )}
      </button>

    </div>
  );
}
