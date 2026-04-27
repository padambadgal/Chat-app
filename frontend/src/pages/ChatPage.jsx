// import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useState } from "react";

function ChatPage() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      
      {/* <Sidebar setSelectedUser={setSelectedUser} /> */}
      
      <ChatWindow selectedUser={selectedUser} />

    </div>
  );
}

export default ChatPage;