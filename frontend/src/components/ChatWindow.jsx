import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getMessages, sendMessage } from '../services/api';
import MessageInput from './MessageInput';

const socket = io('"https://whatsapp-messengers-production.up.railway.app');

const statusIcons = {
  sent: '✅',
  delivered: '✅✅',
  read: '✅✅', // style blue if you want
};

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString();
}

const ChatWindow = ({ wa_id, userName }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!wa_id) return;
    getMessages(wa_id)
      .then((res) => setMessages(res.data || []))
      .catch(console.error);
  }, [wa_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('newMessage', (msg) => {
      if (msg.wa_id === wa_id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('messageStatusUpdate', ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, status } : m))
      );
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageStatusUpdate');
    };
  }, [wa_id]);

  const handleSend = async (text) => {
    if (!text) return;

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      messageId: tempId,
      wa_id,
      contactName: userName || 'Unknown',
      text,
      status: 'sent',
      direction: 'outbound',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendMessage({
        wa_id,
        contactName: optimistic.contactName,
        text,
        status: 'sent',
        messageId: tempId,
      });
      const saved = res.data;
      setMessages((prev) => prev.map((m) => (m.messageId === tempId ? saved : m)));
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  // group by date for UI
  const grouped = [];
  let lastDate = null;
  for (const m of messages) {
    const d = m.timestamp ? new Date(m.timestamp) : new Date();
    const day = d.toDateString();
    if (day !== lastDate) {
      grouped.push({ type: 'date', date: d });
      lastDate = day;
    }
    grouped.push({ type: 'msg', msg: m });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-white border-b sticky top-0 z-10">
        <div className="font-semibold text-lg text-black">{userName || 'Unknown User'}</div>
        <div className="text-sm text-gray-500">{wa_id}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {grouped.map((g, idx) => {
          if (g.type === 'date') {
            return (
              <div key={`date-${idx}`} className="text-center text-xs text-gray-400 my-3">
                {formatDate(g.date)}
              </div>
            );
          }
          const msg = g.msg;
          const isMe = (msg.direction || '').toLowerCase() === 'outbound';
          return (
            <div
              key={msg.messageId || msg._id || idx}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-xs shadow ${
                  isMe ? 'bg-green-200 text-black' : 'bg-white text-black'
                }`}
              >
                <div className="text-sm break-words">{msg.text}</div>
                <div className="text-xs text-gray-600 mt-1 flex justify-end items-center gap-2">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <span>{statusIcons[msg.status]}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
