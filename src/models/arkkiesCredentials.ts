import { db } from '../config/database';

export type ArkkiesCredentialRow = {
  user_id: number;
  email: string;
  password_encrypted: string;
  session_cookie: string | null;
  session_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const findCredentialsByUserId = async (userId: number): Promise<ArkkiesCredentialRow | null> => {
  const result = await db.query<ArkkiesCredentialRow>(
    `SELECT user_id, email, password_encrypted, session_cookie, session_expires_at, created_at, updated_at
       FROM user_arkkies_credentials
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

export const upsertCredentials = async (
  userId: number,
  email: string,
  passwordEncrypted: string,
): Promise<void> => {
  await db.query(
    `INSERT INTO user_arkkies_credentials (user_id, email, password_encrypted)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET
       email = EXCLUDED.email,
       password_encrypted = EXCLUDED.password_encrypted,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, email, passwordEncrypted],
  );
};

export const updateSession = async (
  userId: number,
  sessionCookie: string,
  expiresAt: Date | null,
): Promise<void> => {
  await db.query(
    `UPDATE user_arkkies_credentials
        SET session_cookie = $2,
            session_expires_at = $3,
            updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1`,
    [userId, sessionCookie, expiresAt],
  );
};

