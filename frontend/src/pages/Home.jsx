import React, { useState } from 'react';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';

export default function Home() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState('');

  const handleSelectChat = (wa_id, contactName) => {
    setSelectedChatId(wa_id);
    setSelectedChatName(contactName);
  };

  return (
    <div className="flex h-screen">
      {/* Left panel: Chat List */}
      <div className="w-1/3 border-r">
        <ChatList
          selectedChatId={selectedChatId}
          onSelectChat={(wa_id) => handleSelectChat(wa_id, '')}
        />
      </div>

      {/* Right panel: Chat Window */}
      <div className="flex-1">
        {selectedChatId ? (
          <ChatWindow wa_id={selectedChatId} userName={selectedChatName} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
