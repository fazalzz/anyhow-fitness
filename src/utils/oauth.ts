import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../config/database';
import { BackendUser } from '../types';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "/auth/google/callback"
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    // Check if user exists with this Google ID
    let userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    let user = userResult.rows[0];
    
    if (user) {
      return done(null, user);
    }

    // Check if user exists with this email
    const email = profile.emails?.[0]?.value;
    if (email) {
      userResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      user = userResult.rows[0];
      
      if (user) {
        // Link Google account to existing user
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
        user.google_id = profile.id;
        return done(null, user);
      }
    }

    // Create new user
    const newUserResult = await db.query(`
      INSERT INTO users (email, username, display_name, google_id, email_verified, auth_provider, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, 'google', NOW(), NOW())
      RETURNING *
    `, [
      email || `google_${profile.id}@gmail.com`,
      profile.displayName || `user_${profile.id}`,
      profile.displayName || 'User',
      profile.id
    ]);

    return done(null, newUserResult.rows[0]);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error as Error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, userResult.rows[0] || null);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;