import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// POST /api/upload
router.post(['/upload', '/api/upload'], async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 image format" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      await fs.promises.writeFile(filePath, buffer);
      
      const fileUrl = `/uploads/${filename}`;
      return res.json({ url: image });
    }

    return res.status(400).json({ error: "Unsupported upload format (must be base64 data-uri)" });
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post(['/auth/register', '/api/auth/register'], (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user_id = 'user_' + Math.random().toString(36).substr(2, 9);
  res.json({
    user_id,
    token: 'mock_token_' + Math.random().toString(36).substr(2, 12),
    user: {
      user_id,
      email,
      name: name || email.split('@')[0],
      credibility_score: 100,
      community_hero_points: 0,
      total_issues_reported: 0,
      badges_earned: [],
      is_authority: email === 'vip901it@gmail.com' || email.endsWith('.gov'),
      created_at: new Date().toISOString()
    }
  });
});

// POST /api/auth/login
router.post(['/auth/login', '/api/auth/login'], (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user_id = 'user_' + Math.random().toString(36).substr(2, 9);
  res.json({
    user_id,
    token: 'mock_token_' + Math.random().toString(36).substr(2, 12),
    user: {
      user_id,
      email,
      name: email.split('@')[0],
      credibility_score: 120,
      community_hero_points: 50,
      total_issues_reported: 4,
      badges_earned: ['First Responder', 'Eagle Eye'],
      is_authority: email === 'vip901it@gmail.com' || email.endsWith('.gov'),
      created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
    }
  });
});

// POST /api/auth/logout
router.post(['/auth/logout', '/api/auth/logout'], (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
