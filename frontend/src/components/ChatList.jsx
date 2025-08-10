import React from "react";

const ChatList = ({ chats, selectedChatId, onSelectChat }) => {
  return (
    <div className="overflow-y-auto h-full bg-white border-r">
      {chats.map((chat) => {
        const lastTime = chat.lastTimestamp
          ? new Date(chat.lastTimestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div
            key={chat._id}
            onClick={() => onSelectChat(chat._id)}
            className={`cursor-pointer flex justify-between items-center px-4 py-3 border-b hover:bg-gray-100 transition-colors ${
              selectedChatId === chat._id ? "bg-green-50" : ""
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-gray-900 truncate">
                {chat.contactName || chat._id}
              </span>
              <span className="text-sm text-gray-500 truncate">
                {chat.lastMessage}
              </span>
            </div>
            <div className="flex flex-col items-end ml-3">
              <span className="text-xs text-gray-400">{lastTime}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
