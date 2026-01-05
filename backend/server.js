const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// AI Server URL
const AI_SERVER_URL = 'http://localhost:5001';

// Middleware
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    client.query('SELECT current_database()', (err, result) => {
      if (!err) {
        console.log('📊 Connected to database:', result.rows[0].current_database);
      }
      release();
    });
  }
});

// ============ AI PREDICTION ENDPOINT WITH LOGGING ============

// Proxy endpoint for AI prediction
app.post('/api/predict', upload.single('file'), async (req, res) => {
  console.log('\n=== AI PREDICTION REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    console.log('📁 File received:');
    console.log('  - Filename:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');
    console.log('  - Type:', req.file.mimetype);
    console.log('  - Buffer length:', req.file.buffer.length);

    console.log('🤖 Forwarding image to AI server...');
    console.log('  - Target URL:', `${AI_SERVER_URL}/api/predict`);

    // Create form data to send to Python server
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log('📤 Sending request to AI server...');
    const startTime = Date.now();

    // Send to Python AI server
    const response = await axios.post(`${AI_SERVER_URL}/api/predict`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 second timeout
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('📥 Response received from AI server');
    console.log('  - Duration:', duration, 'ms');
    console.log('  - Status:', response.status);
    console.log('  - Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('✅ AI PREDICTION SUCCESSFUL!');
      console.log('  - Prediction:', response.data.prediction);
      console.log('  - Confidence:', (response.data.confidence * 100).toFixed(2) + '%');
    } else {
      console.log('⚠️ AI prediction returned success: false');
    }

    console.log('📤 Sending response to frontend...');
    res.json(response.data);
    console.log('=== AI PREDICTION REQUEST COMPLETED ===\n');

  } catch (error) {
    console.error('\n❌ AI PREDICTION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.response) {
      console.error('AI Server Response Status:', error.response.status);
      console.error('AI Server Response Data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to AI server at', AI_SERVER_URL);
      console.error('   Please make sure:');
      console.error('   1. AI server is running: python ai_server.py');
      console.error('   2. AI server is listening on port 5001');
      console.error('   3. No firewall is blocking the connection');
      
      return res.status(503).json({ 
        success: false, 
        error: 'AI service is not available. Please make sure the AI server is running on port 5001.' 
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ Request to AI server timed out');
      return res.status(504).json({ 
        success: false, 
        error: 'AI server is taking too long to respond. Please try again.' 
      });
    }
    
    console.error('Stack trace:', error.stack);
    console.error('=== ERROR DETAILS END ===\n');
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI prediction: ' + error.message 
    });
  }
});

// ============ EXISTING ENDPOINTS ============

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({ message: 'Backend is working!' });
});

// Health check for AI server connectivity
app.get('/api/ai-health', async (req, res) => {
  console.log('\n=== CHECKING AI SERVER HEALTH ===');
  try {
    const response = await axios.get(`${AI_SERVER_URL}/health`, { timeout: 5000 });
    console.log('✅ AI server is healthy');
    console.log('Response:', response.data);
    res.json({
      success: true,
      ai_server_status: 'healthy',
      ai_server_data: response.data
    });
  } catch (error) {
    console.error('❌ AI server health check failed');
    console.error('Error:', error.message);
    res.status(503).json({
      success: false,
      ai_server_status: 'unavailable',
      error: error.message
    });
  }
  console.log('=== HEALTH CHECK COMPLETED ===\n');
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;
    console.log('Registration attempt:', { fullName, email, username });

    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (full_name, username, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, full_name, role, instagram_username, created_at',
      [fullName, username, email, hashedPassword, 'Creator']
    );

    console.log('User created successfully:', result.rows[0]);

    res.status(201).json({
      message: 'User registered successfully! 🎉',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error. Please try again.' });
    }
  }
});

// Login endpoint - UPDATED to include instagram_username
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, email, full_name, role, instagram_username, password, created_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    delete user.password;

    res.status(200).json({
      message: 'Login successful!',
      user: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, full_name, username, email, role, instagram_username, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile - UPDATED to include instagram_username
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, instagram_username, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

// Update user profile (handles multiple fields) - NEW COMPREHENSIVE ENDPOINT
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, instagram_username } = req.body;
    
    console.log('Update request for user:', userId);
    console.log('Fields to update:', req.body);
    
    // Build dynamic query based on what fields are provided
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    
    if (instagram_username !== undefined) {
      updates.push(`instagram_username = $${paramCount}`);
      values.push(instagram_username);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }
    
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, username, email, full_name, role, instagram_username, created_at
    `;
    
    console.log('Query:', query);
    console.log('Values:', values);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    console.log('User updated successfully:', result.rows[0]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error updating user:', err);
    
    // Handle unique constraint violation
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Instagram username specifically
app.put('/api/users/:userId/instagram', async (req, res) => {
  try {
    const { userId } = req.params;
    const { instagram_username } = req.body;
    
    console.log('Updating Instagram for user:', userId, 'to:', instagram_username);
    
    const result = await pool.query(
      'UPDATE users SET instagram_username = $1 WHERE id = $2 RETURNING *',
      [instagram_username, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('Instagram updated successfully');
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error updating Instagram:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user role
app.put('/api/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ 
        success: false,
        error: 'Role is required' 
      });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, full_name, role, instagram_username, created_at',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update role' 
    });
  }
});

// ============ POST ENDPOINTS ============

// Create new post with image and AI tags
app.post('/api/posts', upload.single('image'), async (req, res) => {
  console.log('\n=== CREATE POST REQUEST ===');
  try {
    const { user_id, username, title, description, category, user_category, ai_tags } = req.body;

    console.log('📝 Post data:', { user_id, username, title, category, has_ai_tags: !!ai_tags });
    
    if (ai_tags) {
      console.log('🤖 AI Tags:', ai_tags);
    }

    if (!user_id || !username || !title) {
      return res.status(400).json({ error: 'User ID, username, and title are required' });
    }

    let imageUrl = null;

    if (req.file) {
      console.log('☁️ Uploading image to Cloudinary...');
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: 'posts',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Image uploaded:', result.secure_url);
              resolve(result);
            }
          }
        );
        uploadStream.end(req.file.buffer);
      });
      
      imageUrl = result.secure_url;
    }

    const query = `
      INSERT INTO posts 
      (user_id, username, title, description, image_url, category, user_category, ai_tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      user_id,
      username,
      title,
      description || null,
      imageUrl,
      category || null,
      user_category || null,
      ai_tags || null
    ];

    const dbResult = await pool.query(query, values);

    console.log('✅ Post created successfully! ID:', dbResult.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post: dbResult.rows[0]
    });
    console.log('=== CREATE POST COMPLETED ===\n');

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create post. Please try again.' 
    });
  }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM posts ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      posts: result.rows
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch posts' 
    });
  }
});

// Get posts by user
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({
      success: true,
      posts: result.rows
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user posts' 
    });
  }
});

// Get single post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    res.json({
      success: true,
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch post' 
    });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const postResult = await pool.query(
      'SELECT image_url FROM posts WHERE id = $1',
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    const imageUrl = postResult.rows[0].image_url;
    if (imageUrl) {
      const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      console.log('Image deleted from Cloudinary:', publicId);
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete post' 
    });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Server running on http://localhost:${port}`);
  console.log(`📡 AI Server expected at: ${AI_SERVER_URL}`);
  console.log(`\nEndpoints available:`);
  console.log(`  - GET  /api/test          - Test backend`);
  console.log(`  - GET  /api/ai-health     - Check AI server status`);
  console.log(`  - POST /api/predict       - Get AI prediction`);
  console.log(`  - POST /api/posts         - Create post`);
  console.log(`  - PUT  /api/users/:id     - Update user profile`);
  console.log(`  - PUT  /api/users/:id/instagram - Update Instagram`);
  console.log(`\nUse GET /api/ai-health to verify AI server connection\n`);
});