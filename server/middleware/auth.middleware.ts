import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'citymind_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'citymind_super_secret_refresh_key_2026';

// Store refresh tokens in memory for demonstration & scale-to-zero persistence (valid for session life)
const refreshTokens = new Set<string>();

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    name: string;
    is_authority: boolean;
    role?: string;
  };
}

export class JWTAuth {
  static generateTokens(payload: { user_id: string; email: string; name: string; is_authority: boolean }) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    // Track refresh token for rotation / revocation
    refreshTokens.add(refreshToken);
    
    return { accessToken, refreshToken };
  }

  static rotateRefreshToken(oldRefreshToken: string, payload: { user_id: string; email: string; name: string; is_authority: boolean }) {
    if (!refreshTokens.has(oldRefreshToken)) {
      throw new Error('Invalid or revoked refresh token');
    }
    // Revoke old refresh token
    refreshTokens.delete(oldRefreshToken);
    
    // Generate new set
    return this.generateTokens(payload);
  }

  static revokeRefreshToken(token: string) {
    refreshTokens.delete(token);
  }

  static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Soft-auth fallback: some public endpoints don't strictly require authentication, but we can set public flag
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Check if it's a Firebase ID token or a custom JWT
    try {
      // 1. Try custom JWT first
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        name: decoded.name,
        is_authority: !!decoded.is_authority,
        role: decoded.is_authority ? 'authority' : 'citizen'
      };
      return next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      
      // 2. Try Firebase ID token decode
      try {
        const decodedFirebase = jwt.decode(token) as any;
        if (decodedFirebase && decodedFirebase.iss && decodedFirebase.iss.includes('securetoken.google.com')) {
          // Verify audience matches our project-id
          const projectId = 'tranquil-atom-8gbcx';
          if (decodedFirebase.aud === projectId) {
            const email = decodedFirebase.email || '';
            const is_authority = email === 'vip901it@gmail.com' || email.endsWith('.gov');
            req.user = {
              user_id: decodedFirebase.sub || decodedFirebase.user_id,
              email: email,
              name: decodedFirebase.name || email.split('@')[0],
              is_authority,
              role: is_authority ? 'authority' : 'citizen'
            };
            return next();
          }
        }
      } catch (fbErr) {
        console.warn('Could not decode Firebase token:', fbErr);
      }
      
      return res.status(401).json({ error: 'Unauthorized: Invalid token signature or format' });
    }
  }

  static authorizeRole(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userRole = req.user.is_authority ? 'authority' : 'citizen';
      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }
      
      next();
    };
  }
}
