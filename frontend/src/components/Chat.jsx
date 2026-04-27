import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  IoSend,
  IoHappy,
  IoAttach,
  IoMenu,
  IoSearch,
  IoLogOut,
  IoCheckmarkDoneCircle,
  IoCheckmarkCircle,
  IoChatbubbles
} from 'react-icons/io5';
import EmojiPicker from 'emoji-picker-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const token = localStorage.getItem("token")


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUsers();
    fetchConversations();
  }, [user, navigate]);

  useEffect(() => {
    if (!socket) return;

    socket.on('private_message', (message) => {
      if (message.sender._id === selectedUser?._id || message.receiver._id === selectedUser?._id) {
        setMessages(prev => [...prev, message]);
        markMessageAsRead(message._id, message.sender._id);
      }
    });

    socket.on('message_sent', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_typing', ({ userId, isTyping }) => {
      if (userId === selectedUser?._id) {
        setIsUserTyping(isTyping);
      }
    });

    socket.on('message_read', ({ messageId }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
    });

    return () => {
      socket.off('private_message');
      socket.off('message_sent');
      socket.off('user_typing');
      socket.off('message_read');
    };
  }, [socket, selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/search?q=');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        logout();
        navigate('/login');
      }
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/users/conversations',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // console.log('Conversations:', response.data);

      // ✅ Use "user" directly (NOT participants)
      const conversationUsers = response.data.map(conv => conv.user);

      setUsers(prev => {
        const existingIds = new Set(prev.map(u => u._id));
        const newUsers = conversationUsers.filter(
          u => u && !existingIds.has(u._id)
        );
        return [...prev, ...newUsers];
      });

    } catch (error) {
      console.error('Error fetching conversations:', error);

      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };

  const selectUser = async (selected) => {
    if (!selected || !selected._id) {
      console.error('Invalid selected user');
      return;
    }

    setSelectedUser(selected);
    setMessages([]);

    try {
      console.log('Fetching messages for:', selected._id);

      const response = await axios.get(
        `http://localhost:5000/api/messages/${selected._id}`, // ✅ FIXED
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Messages response:', response.data);

      setMessages(response.data);

    } catch (error) {
      console.error(
        'Error fetching messages:',
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };

  const sendMessage = async () => {
    console.log("Sending:", inputMessage, selectedUser);

    if (!inputMessage.trim() || !selectedUser || !socket) {
      console.log("❌ Blocked send");
      return;
    }

    socket.emit('private_message', {
      receiverId: selectedUser._id,
      content: inputMessage
    });
    setInputMessage('');
  };

  const handleTyping = () => {
    if (!typing && selectedUser && socket) {
      setTyping(true);
      socket.emit('typing_start', { receiverId: selectedUser._id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_end', { receiverId: selectedUser._id });
        setTyping(false);
      }, 1000);
    }
  };

  const markMessageAsRead = async (messageId, senderId) => {
    if (socket) {
      socket.emit('mark_read', { messageId, senderId });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredUsers = users.filter(u =>
    u?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full border-2 bg-gray-400 flex items-center justify-center text-white font-semibold text-lg cursor-pointer hover:opacity-80">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">{user?.username}</h2>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <IoLogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/4 transform text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No users found</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u._id}
                onClick={() => selectUser(u)}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${selectedUser?._id === u._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 bg-gray-400 flex items-center justify-center text-white font-semibold text-lg">
                      {u.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{u.username}</h3>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedUser ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full border-2 bg-gray-400 flex items-center justify-center text-white font-semibold text-lg">
                {selectedUser.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">{selectedUser.username}</h2>
                <p className="text-xs text-gray-500">
                  {isUserTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <IoMenu size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender?._id === user.id;
                return (
                  <div
                    key={message._id || index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-lg px-4 py-2 ${isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                      >
                        <p className="text-sm break-words">{message.text}</p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs opacity-75">
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </span>
                          {isOwnMessage && (
                            message.read ? (
                              <IoCheckmarkDoneCircle size={12} className="text-blue-200" />
                            ) : (
                              <IoCheckmarkCircle size={12} className="text-blue-200" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 p-4 relative">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <IoHappy size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <IoAttach size={20} className="text-gray-600" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyUp={handleTyping}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoSend size={20} />
              </button>
            </div>
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-4 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setInputMessage(prev => prev + emojiObject.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <IoChatbubbles size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a user to start chatting</h3>
            <p className="text-gray-400">Choose a conversation from the sidebar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;