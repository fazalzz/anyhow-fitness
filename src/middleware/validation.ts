import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { name, pin, phoneNumber } = req.body;
  
  if (!name || !pin || !phoneNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (pin.length !== 8 || !/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 8 digits' });
  }
  
  if (phoneNumber.length !== 8 || !/^\d+$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'Phone number must be 8 digits' });
  }
  
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { name, pin } = req.body;
  
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }
  
  next();
};

export const validateChangePin = (req: Request, res: Response, next: NextFunction) => {
  const { currentPin, newPin } = req.body;
  
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Current PIN and new PIN are required' });
  }
  
  if (newPin.length !== 8 || !/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 8 digits' });
  }
  
  next();
};