import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // INCREASED for development - limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rate limiting for general API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // allow 10 requests per 15 minutes at full speed
  delayMs: 500, // slow down subsequent requests by 500ms per request
  maxDelayMs: 10000, // maximum delay of 10 seconds
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Basic sanitization - remove any potential script tags
  const sanitizeObject = (obj: any): void => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove script tags and other potentially dangerous content
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  
  next();
};

// HTTPS enforcement middleware
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    res.redirect(301, `https://${req.get('host')}${req.url}`);
    return;
  }
  next();
};

// Security audit logging
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/change-pin',
    '/api/auth/refresh'
  ];

  if (securityEvents.includes(req.path)) {
    console.log(`[SECURITY] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  }

  next();
};

// Detect suspicious activity
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$regex)/i, // NoSQL injection
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i, // SQL injection
  ];

  const requestBody = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestBody) || pattern.test(queryString)) {
      console.warn(`[SECURITY WARNING] Suspicious activity detected from IP ${req.ip} - Pattern: ${pattern}`);
      res.status(400).json({ error: 'Invalid request detected' });
      return;
    }
  }

  next();
};