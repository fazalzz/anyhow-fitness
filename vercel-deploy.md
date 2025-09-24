# Vercel Deployment Guide for Anyhow Fitness Frontend

## Quick Deploy Steps:

1. **Go to vercel.com**
   - Sign up with GitHub
   - Import your repository

2. **Configure Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables in Vercel:**
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app
   ```

4. **Update your React code to use the API URL:**
   ```javascript
   // In your API calls, replace localhost with:
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
   ```

## Your Vercel URL will be:
`https://your-app-name.vercel.app`

## Cost:
- Completely FREE for personal projects
- Unlimited bandwidth
- Global CDN