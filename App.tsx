import React, { useState } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const ChatApp: React.FC = () => {
  const { state } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dark mode toggle in useEffect
  React.useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (!state.currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <ChatWindow onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
};

export default App;