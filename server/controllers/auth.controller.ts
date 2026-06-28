import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { JWTAuth } from '../middleware/auth.middleware';

export class AuthController {
  static async uploadImage(req: Request, res: Response) {
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
        
        return res.json({ url: image });
      }

      return res.status(400).json({ error: "Unsupported upload format (must be base64 data-uri)" });
    } catch (err: any) {
      console.error("Upload error in AuthController:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static register(req: Request, res: Response) {
    const { email, name, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user_id = 'user_' + Math.random().toString(36).substr(2, 9);
    const userName = name || email.split('@')[0];
    const is_authority = email === 'vip901it@gmail.com' || email.endsWith('.gov');

    const { accessToken, refreshToken } = JWTAuth.generateTokens({
      user_id,
      email,
      name: userName,
      is_authority
    });

    return res.json({
      user_id,
      token: accessToken,
      refreshToken,
      user: {
        user_id,
        email,
        name: userName,
        credibility_score: 100,
        community_hero_points: 0,
        total_issues_reported: 0,
        badges_earned: [],
        is_authority,
        created_at: new Date().toISOString()
      }
    });
  }

  static login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user_id = 'user_' + Math.random().toString(36).substr(2, 9);
    const userName = email.split('@')[0];
    const is_authority = email === 'vip901it@gmail.com' || email.endsWith('.gov');

    const { accessToken, refreshToken } = JWTAuth.generateTokens({
      user_id,
      email,
      name: userName,
      is_authority
    });

    return res.json({
      user_id,
      token: accessToken,
      refreshToken,
      user: {
        user_id,
        email,
        name: userName,
        credibility_score: 120,
        community_hero_points: 50,
        total_issues_reported: 4,
        badges_earned: ['First Responder', 'Eagle Eye'],
        is_authority,
        created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
      }
    });
  }

  static logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (refreshToken) {
      JWTAuth.revokeRefreshToken(refreshToken);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  static refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
      // Decode old refresh token to get payload
      const jwtSecret = process.env.JWT_REFRESH_SECRET || 'citymind_super_secret_refresh_key_2026';
      const jwtDecrypted = require('jsonwebtoken').verify(refreshToken, jwtSecret) as any;

      const newTokens = JWTAuth.rotateRefreshToken(refreshToken, {
        user_id: jwtDecrypted.user_id,
        email: jwtDecrypted.email,
        name: jwtDecrypted.name,
        is_authority: jwtDecrypted.is_authority
      });

      return res.json({
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
      });
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }
}
