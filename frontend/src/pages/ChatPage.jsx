import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

function ChatPage() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      <Sidebar setSelectedUser={setSelectedUser} selectedUser={selectedUser} />
      <ChatWindow selectedUser={selectedUser} />
    </div>
  );
}

export default ChatPage;