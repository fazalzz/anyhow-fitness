import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPin = async (pin: string): Promise<string> => {
  return await bcrypt.hash(pin, SALT_ROUNDS);
};

export const comparePin = async (pin: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(pin, hash);
};