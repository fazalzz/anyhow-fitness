import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const getSecretKey = (): Buffer => {
  const secret = process.env.ARKKIES_SECRET_KEY;
  if (!secret) {
    throw new Error('ARKKIES_SECRET_KEY environment variable is not set');
  }

  if (secret.length === 64) {
    return Buffer.from(secret, 'hex');
  }

  if (secret.length === 44) {
    return Buffer.from(secret, 'base64');
  }

  if (secret.length === 32) {
    return Buffer.from(secret, 'utf8');
  }

  throw new Error('ARKKIES_SECRET_KEY must be a 32-byte key encoded as hex, base64, or utf8 string');
};

export const encryptString = (plaintext: string): string => {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptString = (ciphertext: string): string => {
  const key = getSecretKey();
  const payload = Buffer.from(ciphertext, 'base64');

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

