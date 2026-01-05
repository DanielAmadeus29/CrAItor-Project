// src/utils/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🌐 API_URL configured as:', API_URL);

// User Authentication API
export const authAPI = {
  // Register new user
  register: async (fullName, email, username, password) => {
    console.log('🔐 authAPI.register called');
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return await response.json();
  },

  // Login user
  login: async (username, password) => {
    console.log('🔐 authAPI.login called for:', username);
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    return await response.json();
  }
};

// Posts API
export const postsAPI = {
  // Get all posts for a specific user
  getUserPosts: async (username) => {
    console.log('📥 postsAPI.getUserPosts called for:', username);
    console.log('Fetching from:', `${API_URL}/posts/${username}`);
    
    const response = await fetch(`${API_URL}/posts/${username}`);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch posts');
      throw new Error('Failed to fetch posts');
    }
    
    const data = await response.json();
    console.log('✅ Posts fetched:', data.length, 'posts');
    return data;
  },

  // Get single post by ID
  getPost: async (id) => {
    console.log('📥 postsAPI.getPost called for ID:', id);
    const response = await fetch(`${API_URL}/posts/detail/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }
    
    return await response.json();
  },

  // Get all posts (with optional category filter)
  getAllPosts: async (category = null, limit = 50) => {
    console.log('📥 postsAPI.getAllPosts called');
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', limit);
    
    const response = await fetch(`${API_URL}/posts?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    
    return await response.json();
  },

  // Create new post
  createPost: async (username, postData) => {
    console.log('📤 postsAPI.createPost called');
    console.log('Username:', username);
    console.log('Post data:', postData);
    console.log('API endpoint:', `${API_URL}/posts`);
    
    const payload = {
      username,
      ...postData
    };
    
    console.log('Payload being sent:', payload);
    
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Server error response:', error);
      throw new Error(error.error || 'Failed to create post');
    }
    
    const result = await response.json();
    console.log('✅ Post created successfully:', result);
    return result;
  },

  // Update post
  updatePost: async (id, username, postData) => {
    console.log('📤 postsAPI.updatePost called for ID:', id);
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        ...postData
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update post');
    }
    
    return await response.json();
  },

  // Delete post
  deletePost: async (id, username) => {
    console.log('🗑️ postsAPI.deletePost called for ID:', id);
    const response = await fetch(`${API_URL}/posts/${id}?username=${username}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete post');
    }
    
    return await response.json();
  }
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    console.log('📥 categoriesAPI.getAll called');
    const response = await fetch(`${API_URL}/categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return await response.json();
  }
};

export default {
  auth: authAPI,
  posts: postsAPI,
  categories: categoriesAPI
};