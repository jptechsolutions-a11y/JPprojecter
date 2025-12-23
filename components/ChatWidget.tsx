import React, { useState } from 'react';
import { MessageCircle, X, Send, Minus } from 'lucide-react';
import { User } from '../types';
import { Avatar } from './Avatar';

interface ChatWidgetProps {
  users: User[];
  currentUser: User;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ users, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Olá time! Alguém pode revisar o PR?', senderId: '2', timestamp: new Date(Date.now() - 1000 * 60 * 60) }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      text: newMessage,
      senderId: currentUser.id,
      timestamp: new Date()
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all z-50 flex items-center gap-2 group"
      >
        <MessageCircle size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-medium whitespace-nowrap">
          Chat do Time
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 w-72 bg-white rounded-t-lg shadow-xl border border-gray-200 z-50 flex justify-between items-center p-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
         <span className="font-bold text-gray-700 flex items-center gap-2">
           <MessageCircle size={18} className="text-indigo-600" /> Chat do Time
         </span>
         <div className="flex items-center gap-2">
           <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-gray-100 p-1 rounded">
             <X size={16} />
           </button>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 rounded-t-2xl text-white">
        <h3 className="font-bold flex items-center gap-2">
           <MessageCircle size={20} /> Chat do Time
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setIsMinimized(true)} className="hover:bg-indigo-500 p-1 rounded transition-colors"><Minus size={18} /></button>
          <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded transition-colors"><X size={18} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.id;
          const sender = users.find(u => u.id === msg.senderId);
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
               {!isMe && <Avatar src={sender?.avatar} alt={sender?.name || '?'} size="sm" className="mt-1" />}
               <div className={`p-3 rounded-lg max-w-[80%] text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'}`}>
                 {!isMe && <div className="text-[10px] font-bold opacity-70 mb-1">{sender?.name}</div>}
                 {msg.text}
                 <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                   {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </div>
               </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem..."
            className="w-full pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleSend}
            className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};