# Railway Deployment Guide for Anyhow Fitness Backend

## Quick Deploy Steps:

1. **Go to railway.app**
   - Sign up with GitHub
   - Connect your repository

2. **Create New Project**
   - Click "Deploy from GitHub repo"
   - Select your Anyhow Fitness repo
   - Choose "Deploy Now"

3. **Set Environment Variables in Railway:**
   ```
   DATABASE_URL=postgresql://postgres:QSNFuKyM4g6lqLkx@db.gcurjrbuazviasegjcgi.supabase.co:5432/postgres
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-super-secret-production-jwt-key-change-this
   CLIENT_URL=https://your-vercel-app.vercel.app
   ```

4. **Railway will automatically:**
   - Detect your Node.js app
   - Run `npm install`
   - Run `npm run build:backend`
   - Start with `npm start`

## Your Railway URL will be:
`https://your-app-name.up.railway.app`

## Cost:
- Free tier: $5 credit monthly
- After free tier: ~$5-10/month