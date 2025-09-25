import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, UserPlusIcon, UsersIcon } from './icons';
import { FrontendUser } from '../types';
import * as api from '../apiClient';

interface SocialProps {
  onNavigate: (view: string) => void;
}

export const Social: React.FC<SocialProps> = ({ onNavigate: _ }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'search'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FrontendUser[]>([]);
  const [friends, setFriends] = useState<FrontendUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    if (currentUser) {
      loadFriends();
      loadFriendRequests();
      if (activeTab === 'feed') {
        loadPosts();
      }
    }
  }, [currentUser, activeTab]);

  const loadFriends = async () => {
    try {
      // TODO: Implement friends API endpoint
      setFriends([]);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      // TODO: Implement friend requests API endpoint
      setFriendRequests([]);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await api.apiFetchPosts();
      setPosts(response.data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.apiFetchUsers();
      const users = response.data || [];
      const filtered = users.filter((user: FrontendUser) => 
        user.id !== currentUser?.id &&
        (user.displayName.toLowerCase().includes(query.toLowerCase()) ||
         user.username.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchUsers(query);
  };

  const renderFeed = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <UsersIcon />
          </div>
        </div>
        <h3 className="text-lg font-medium text-brand-primary mt-2">Social Feed</h3>
        <p className="text-brand-secondary-text mt-1">Connect with friends to see their workouts</p>
      </div>
      
      {posts.length === 0 ? (
        <div className="bg-brand-bg rounded-lg p-6 text-center border border-brand-border">
          <p className="text-brand-secondary-text">No posts yet. Start following friends to see their activity!</p>
        </div>
      ) : (
        posts.map((post, index) => (
          <div key={index} className="bg-brand-bg rounded-lg border border-brand-border p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {post.user?.displayName?.[0] || 'U'}
              </div>
              <div>
                <p className="font-medium text-brand-primary">{post.user?.displayName || 'User'}</p>
                <p className="text-sm text-brand-secondary-text">{new Date(post.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-brand-secondary">{post.content}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderFriends = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-brand-primary">Friends</h3>
        <button
          onClick={() => setActiveTab('search')}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlusIcon />
          <span>Add Friends</span>
        </button>
      </div>

      {friendRequests.length > 0 && (
        <div className="bg-brand-bg rounded-lg p-4 border border-brand-border">
          <h4 className="font-medium text-brand-primary mb-2">Friend Requests</h4>
          {friendRequests.map((request, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-brand-surface-alt rounded-full flex items-center justify-center text-brand-primary">
                  {request.from_user?.displayName?.[0] || 'U'}
                </div>
                <span className="font-medium text-brand-primary">{request.from_user?.displayName}</span>
              </div>
              <div className="space-x-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">Accept</button>
                <button className="px-3 py-1 bg-brand-surface-alt text-brand-secondary-text rounded text-sm hover:bg-brand-border transition-colors">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 ? (
        <div className="bg-brand-bg rounded-lg p-6 text-center border border-brand-border">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <UsersIcon />
            </div>
          </div>
          <p className="text-brand-secondary-text">No friends yet. Search for users to connect with!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map((friend, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-brand-bg rounded-lg border border-brand-border">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {friend.displayName[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-brand-primary">{friend.displayName}</p>
                <p className="text-sm text-brand-secondary-text">@{friend.username}</p>
              </div>
              <button className="px-3 py-1 bg-brand-surface-alt text-brand-secondary-text rounded text-sm hover:bg-brand-border transition-colors">
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search for users..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-brand-primary placeholder-brand-secondary-text"
        />
        <div className="absolute left-3 top-3.5 text-brand-secondary-text">
          <SearchIcon />
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <p className="text-brand-secondary-text">Searching...</p>
        </div>
      )}

      {searchResults.length === 0 && searchQuery && !loading && (
        <div className="text-center py-8">
          <p className="text-brand-secondary-text">No users found matching "{searchQuery}"</p>
        </div>
      )}

      <div className="space-y-2">
        {searchResults.map((user) => (
          <div key={user.id} className="flex items-center space-x-3 p-3 bg-brand-bg rounded-lg border border-brand-border">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {user.displayName[0]}
            </div>
            <div className="flex-1">
              <p className="font-medium text-brand-primary">{user.displayName}</p>
              <p className="text-sm text-brand-secondary-text">@{user.username}</p>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: 'feed', label: 'Feed', icon: UsersIcon },
    { id: 'friends', label: 'Friends', icon: UsersIcon },
    { id: 'search', label: 'Search', icon: SearchIcon }
  ];

  return (
    <div className="p-4 space-y-6 bg-brand-surface min-h-full">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-brand-bg rounded-lg p-1 border border-brand-border">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-brand-secondary-text hover:text-brand-primary'
              }`}
            >
              <IconComponent />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'search' && renderSearch()}
      </div>
    </div>
  );
};