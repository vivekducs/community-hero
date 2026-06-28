import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const ipLimits = new Map<string, RateLimitInfo>();

export function customRateLimiter(limit: number = 100, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const info = ipLimits.get(ip);

    if (!info || now > info.resetTime) {
      ipLimits.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - 1);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      return next();
    }

    if (info.count >= limit) {
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(info.resetTime).toISOString());
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfterMs: info.resetTime - now,
      });
    }

    info.count += 1;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - info.count);
    res.setHeader('X-RateLimit-Reset', new Date(info.resetTime).toISOString());
    next();
  };
}

// Simple sanitize function to prevent basic HTML injection
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

export function requestSizeValidator(maxBytes: number = 50 * 1024 * 1024) { // 50MB matches express.json limit
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return res.status(413).json({
        error: 'Payload Too Large. Maximum size is 50MB.',
      });
    }
    next();
  };
}
