import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  IoSend,
  IoHappy,
  IoAttach,
  IoMenu,
  IoCheckmarkDoneCircle,
  IoCheckmarkCircle,
  IoChatbubbles,
  IoTrashBin,
  IoCreate,
  IoClose,
  IoSave,
  IoMoon,
  IoSunny
} from 'react-icons/io5';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';

const ChatWindow = ({ selectedUser }) => {
  const { user, logout } = useAuth();
  // console.log("Logged User:", user);
  const socket = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const menuRef = useRef(null);
  const editInputRef = useRef(null);
  const token = localStorage.getItem('token');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingMessageId]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on('private_message', (message) => {
      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      if (
        message.sender._id === selectedUser?._id ||
        receiverId === selectedUser?._id
      ) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('message_sent', (message) => {
      setMessages(prev => [...prev, message]);
      console.log(message);
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

    socket.on('message_deleted', (data) => {
      console.log('📩 Message deleted event received:', data);

      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId) {
          return {
            ...msg,
            content: '🗑️ This message was deleted',
            isDeleted: true,
            deletedBy: data.deletedBy,
            deletedAt: data.deletedAt
          };
        }
        return msg;
      }));

      if (data.deletedBy !== user?._id) {
        toast.success('Message was deleted by the sender');
      }
    });

    socket.on('message_edited', (data) => {
      console.log('📩 Message edited event received:', data);

      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId) {
          return {
            ...msg,
            content: data.newContent,
            edited: true
          };
        }
        return msg;
      }));

      if (data.senderId !== user?._id) {
        toast.success('Message was edited');
      }
    });

    socket.on('chat_cleared', (data) => {
      console.log('📩 Chat cleared event received:', data);
      setMessages([]);
      toast.info('Chat has been cleared');
    });

    socket.on('chat_cleared_success', (data) => {
      console.log('✅ Chat cleared successfully:', data);
      setMessages([]);
      toast.dismiss();
      toast.success(`Chat cleared (${data.deletedCount || 0} messages deleted)`);
    });

    socket.on('clear_chat_error', ({ error }) => {
      toast.dismiss();
      toast.error(error || 'Failed to clear chat');
    });

    socket.on('delete_error', ({ error }) => {
      toast.error(error || 'Failed to delete message');
    });

    socket.on('edit_error', ({ error }) => {
      toast.error(error || 'Failed to edit message');
    });

    return () => {
      socket.off('private_message');
      socket.off('message_sent');
      socket.off('user_typing');
      socket.off('message_read');
      socket.off('message_deleted');
      socket.off('message_edited');
      socket.off('chat_cleared');
      socket.off('chat_cleared_success');
      socket.off('clear_chat_error');
      socket.off('delete_error');
      socket.off('edit_error');
    };
  }, [socket, selectedUser, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!selectedUser || !selectedUser._id) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/messages/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !selectedUser || !socket) return;

    socket.emit('private_message', {
      receiverId: selectedUser._id,
      content: inputMessage,
      type: 'text'
    });
    setInputMessage('');
    setShowEmojiPicker(false);
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

  const markMessageAsRead = (messageId, senderId) => {
    if (socket) {
      socket.emit('mark_read', { messageId, senderId });
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (editingMessageId) {
      toast.error("Finish editing first.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this message for everyone?')) {
      return;
    }

    if (socket) {
      socket.emit('delete_message', { messageId });
    } else {
      toast.error('Socket not connected!');
    }
  };

  const handleStartEditing = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.content);
    setHoveredMessageId(null);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (socket) {
      setMessages(prev => prev.map(msg => {
        if (msg._id === editingMessageId) {
          return {
            ...msg,
            content: editingText,
            edited: true
          };
        }
        return msg;
      }));

      socket.emit('edit_message', {
        messageId: editingMessageId,
        newContent: editingText
      });

      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message updated');
    } else {
      toast.error('Socket not connected!');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleClearChat = () => {
    if (!selectedUser || !selectedUser._id) {
      toast.error('No user selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete all messages with ${selectedUser.username}?`)) {
      return;
    }

    setShowMenu(false);
    toast.loading('Clearing chat...');

    if (socket) {
      socket.emit('clear_chat', { userId: selectedUser._id });
    } else {
      toast.dismiss();
      toast.error('Socket not connected!');
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.body.classList.toggle('dark');
    toast.success(`Switched to ${isDarkTheme ? 'Light' : 'Dark'} theme`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSaveEdit();
      } else {
        sendMessage();
      }
    }
    if (e.key === 'Escape' && editingMessageId) {
      handleCancelEdit();
    }
  };

  if (!selectedUser) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <IoChatbubbles size={64} className={`mx-auto mb-4 ${isDarkTheme ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a user to start chatting
          </h3>
          <p className={isDarkTheme ? 'text-gray-500' : 'text-gray-400'}>
            Choose a conversation from the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Chat Header */}
      <div className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
            {selectedUser.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className={`font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>
              {selectedUser.username}
            </h2>
            <p className={`text-xs ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
              {isUserTyping ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
          >
            <IoMenu size={20} className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'} />
          </button>

          {showMenu && (
            <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl border z-50 overflow-hidden ${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
              >
                {isDarkTheme ? (
                  <IoSunny size={18} className="text-yellow-400" />
                ) : (
                  <IoMoon size={18} className="text-gray-600" />
                )}
                <span className={isDarkTheme ? 'text-white' : 'text-gray-800'}>
                  {isDarkTheme ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
              <div className={`border-t ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}></div>
              <button
                onClick={handleClearChat}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
              >
                <IoTrashBin size={18} className="text-red-500" />
                <span className={isDarkTheme ? 'text-white' : 'text-gray-800'}>
                  Clear Chat
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className={`text-center py-8 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const currentUserId = user?._id || user?.id;

            const senderId =
              typeof message.sender === "object"
                ? message.sender._id
                : message.sender;

            const isOwnMessage = senderId === currentUserId;

            console.log({
              sender: message.sender,
              senderId: senderId,
              currentUserId: currentUserId,
              own: isOwnMessage
            });
            const isEditing = editingMessageId === message._id;
            const isDeleted = message.isDeleted || message.content === '🗑️ This message was deleted';
            const isHovered = hoveredMessageId === message._id;

            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-up group relative`}
                onMouseEnter={() => setHoveredMessageId(message._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'} relative`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-lg px-4 py-2 ${isDeleted
                      ? 'bg-gray-600 text-gray-400 italic'
                      : isOwnMessage
                        ? isDarkTheme
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-blue-500 text-white rounded-br-none'
                        : isDarkTheme
                          ? 'bg-gray-700 text-white rounded-bl-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          className={`flex-1 px-2 py-1 rounded ${isDarkTheme ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 hover:bg-opacity-20 hover:bg-white rounded transition-colors"
                          title="Save"
                        >
                          <IoSave size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-opacity-20 hover:bg-white rounded transition-colors"
                          title="Cancel"
                        >
                          <IoClose size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm break-words ${isDeleted ? 'opacity-60' : ''}`}>
                          {isDeleted ? '🗑️ This message was deleted' : message.content}
                        </p>

                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs opacity-75">
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </span>
                          {isOwnMessage && !isDeleted && (
                            message.read ? (
                              <IoCheckmarkDoneCircle size={12} className={isDarkTheme ? 'text-blue-300' : 'text-blue-200'} />
                            ) : (
                              <IoCheckmarkCircle size={12} className={isDarkTheme ? 'text-blue-300' : 'text-blue-200'} />
                            )
                          )}
                          {message.edited && !isDeleted && (
                            <span className="text-xs opacity-60 ml-1">(edited)</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 🗑️✏️ Message Action Buttons - Now always visible for own messages */}
                  {/* 🗑️✏️ Message Action Buttons - Alternative approach */}
                  {isOwnMessage && !isDeleted && !isEditing && (
                    <div className="absolute -top-3 -right-3 flex space-x-1 z-10 
                      opacity-0 transition-opacity duration-200
                      group-hover:opacity-100">
                      <button
                        onClick={() => handleStartEditing(message)}
                        className="p-1.5 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:scale-110 transition-all duration-200"
                        title="Edit message"
                      >
                        <IoCreate size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="p-1.5 rounded-full shadow-lg bg-red-500 hover:bg-red-600 text-white hover:scale-110 transition-all duration-200"
                        title="Delete for everyone"
                      >
                        <IoTrashBin size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4 relative`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
          >
            <IoHappy size={20} className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'} />
          </button>
          <button className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}>
            <IoAttach size={20} className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'} />
          </button>
          <input
            type="text"
            value={editingMessageId ? editingText : inputMessage}
            onChange={(e) => {
              if (editingMessageId) {
                setEditingText(e.target.value);
              } else {
                setInputMessage(e.target.value);
              }
            }}
            onKeyPress={handleKeyPress}
            onKeyUp={!editingMessageId ? handleTyping : undefined}
            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
            className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkTheme
              ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
              : 'bg-gray-100 border border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
          />
          {editingMessageId ? (
            <button
              onClick={handleCancelEdit}
              className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
            >
              <IoClose size={20} className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoSend size={20} />
            </button>
          )}
        </div>
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                if (editingMessageId) {
                  setEditingText(prev => prev + emojiObject.emoji);
                } else {
                  setInputMessage(prev => prev + emojiObject.emoji);
                }
                setShowEmojiPicker(false);
              }}
              width={320}
              height={400}
              theme={isDarkTheme ? 'dark' : 'light'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;