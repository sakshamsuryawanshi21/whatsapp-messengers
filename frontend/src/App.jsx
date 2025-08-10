// frontend/src/App.jsx (or src/main component)
import React, { useEffect, useState } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import { getChats } from './services/api';

export default function App() {
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    getChats().then(res => setChats(res.data)).catch(console.error);
  }, []);

  return (
    <div className="flex h-screen">
      <aside className="w-1/3 border-r">
        <div className="p-4 font-bold">Chats</div>
        <ChatList chats={chats} selectedChatId={selected} onSelectChat={(id) => {
          const c = chats.find(x => x._id === id);
          setSelected(id);
          setSelectedName(c?.contactName || '');
        }} />
      </aside>

      <main className="flex-1">
        {selected ? <ChatWindow wa_id={selected} userName={selectedName} /> : <div className="p-8 text-gray-500">Select a chat</div>}
      </main>
    </div>
  );
}
