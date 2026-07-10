import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoSearch, IoLogOut, IoChatbubbles } from 'react-icons/io5';

const Sidebar = ({ setSelectedUser, selectedUser }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchConversations();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/search?q=', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/users/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const conversationUsers = response.data.map(conv => conv.user).filter(u => u);
      
      setUsers(prev => {
        const existingIds = new Set(prev.map(u => u._id));
        const newUsers = conversationUsers.filter(u => u && !existingIds.has(u._id));
        return [...prev, ...newUsers];
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  const filteredUsers = users.filter(u =>
    u?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              onClick={goToProfile}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white">{user?.username}</h2>
              <p className="text-xs text-green-400">Online</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <IoLogOut size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <IoChatbubbles size={40} className="mx-auto mb-2 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedUser?._id === u._id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 flex items-center justify-center text-white font-semibold text-lg">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                    u.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{u.username}</h3>
                  <p className="text-sm text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;