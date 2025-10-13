import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Validation middleware for registration
export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('pin')
    .isLength({ min: 4, max: 8 })
    .isNumeric()
    .withMessage('PIN must be 4-8 digits'),
  body('email')
    .isEmail()
    .withMessage('A valid email is required'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

// Validation middleware for login
export const validateLogin = [
  body('pin')
    .isLength({ min: 4, max: 8 })
    .isNumeric()
    .withMessage('PIN must be 4-8 digits'),
  body()
    .custom((_, { req }) => {
      const { name, username, email } = req.body;
      const identifiers = [name, username, email].filter((value: unknown) =>
        typeof value === 'string' && value.trim().length > 0,
      );
      if (identifiers.length === 0) {
        throw new Error('A username, name, or email is required');
      }
      return true;
    }),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

// Validation middleware for changing PIN
export const validateChangePin = [
  body('currentPin')
    .notEmpty()
    .withMessage('Current PIN is required'),
  body('newPin')
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage('New PIN must be 4-6 digits'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];




