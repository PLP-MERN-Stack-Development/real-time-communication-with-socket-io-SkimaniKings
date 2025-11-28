import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Hash, Users, Circle, Search, LogOut } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { state, changeRoom } = useChat();
  const { activeRoomId, users, currentUser } = state;
  const [searchTerm, setSearchTerm] = useState('');

  const rooms = [
    { id: 'general', name: 'General', type: 'public' },
    { id: 'tech', name: 'Tech Talk', type: 'public' },
    { id: 'random', name: 'Random', type: 'public' },
  ];

  const filteredUsers = users.filter(u => 
    u.id !== currentUser?.id && 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 flex flex-col h-full
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            ChatIO
        </h2>
        <button onClick={onClose} className="md:hidden text-gray-500">
            &times;
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 bg-gray-50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
            <img src={currentUser?.avatar} alt="Me" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {currentUser?.username}
                </p>
                <div className="flex items-center text-xs text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Online
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Rooms */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Hash className="w-3 h-3" /> Rooms
          </h3>
          <div className="space-y-1">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => {
                    changeRoom(room.id);
                    if(window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeRoomId === room.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="w-4 h-4 mr-3 text-gray-400" />
                {room.name}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Users className="w-3 h-3" /> Direct Messages
          </h3>
          
          <div className="relative mb-3">
             <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-slate-900 dark:text-gray-300 border-none focus:ring-1 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
             <Search className="w-3 h-3 absolute left-2.5 top-2 text-gray-400" />
          </div>

          <div className="space-y-1">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                    changeRoom(user.id); // Private room ID is user ID for simplicity in this demo
                    if(window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeRoomId === user.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                }`}
              >
                <div className="relative mr-3">
                  <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-slate-800 rounded-full ${
                      user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                </div>
                {user.username}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;