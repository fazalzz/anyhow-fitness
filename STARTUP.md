# Complete Guide to Running Anyhow Fitness Website

## Prerequisites
1. Node.js and npm installed
2. PostgreSQL installed and running
3. PM2 installed globally (optional, for production)

## First-Time Setup

1. Install Dependencies:
```bash
npm install
```

2. Set Up Environment Variables:
- Copy .env.example to .env
- Update the following variables:
  ```
  DATABASE_URL=postgres://username:password@localhost:5432/pr4pr_db
  JWT_SECRET=your_secret_key
  ```

3. Create Database:
```bash
# Connect to PostgreSQL
psql

# Create database
CREATE DATABASE pr4pr_db;

# Exit psql
\q
```

4. Run Database Migrations:
```bash
npm run migrate
```

5. Verify Database Setup:
```bash
npm run test:db
```

## Development Mode

1. Start Both Frontend and Backend:
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:5173
- Backend at http://localhost:4000

OR start them separately:

2. Start Backend Only:
```bash
npm run dev:backend
```

3. Start Frontend Only:
```bash
npm run dev:frontend
```

## Production Mode

1. Build the Application:
```bash
npm run build
```

2. Start with PM2:
```bash
npm run pm2:start
```

Useful PM2 Commands:
- View logs: `npm run pm2:logs`
- Restart server: `npm run pm2:restart`
- Stop server: `npm run pm2:stop`

## Testing the Setup

1. Test Backend API:
```bash
# Health check
curl http://localhost:4000/api/health

# Test authentication
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"testuser","pin":"12345678","phoneNumber":"1234567890"}'
```

2. Frontend Access:
- Open http://localhost:5173 in your browser
- Try to register/login
- Test workout tracking features
- Check social feed

## Troubleshooting

1. If Database Connection Fails:
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Run `npm run test:db` to test connection

2. If Frontend Can't Connect to Backend:
- Ensure backend is running (http://localhost:4000)
- Check for CORS issues in browser console
- Verify API_URL in frontend configuration

3. If Changes Don't Reflect:
- Frontend: Changes should hot-reload
- Backend: Server should auto-restart
- Database: Re-run migrations with `npm run migrate`

## Directory Structure

- /src - Backend source code
  - /controllers - Request handlers
  - /routes - API routes
  - /middleware - Custom middleware
  - /utils - Utility functions
  - /config - Configuration files

- /components - Frontend React components
- /hooks - Custom React hooks
- /context - React context providers
- /migrations - Database migrations

## Common Operations

1. Add New Features:
- Backend: Add routes in /src/routes
- Frontend: Add components in /components
- Database: Add migrations in /migrations

2. Update Database:
- Create new migration file
- Run `npm run migrate`

3. View Logs:
- Development: Console output
- Production: `npm run pm2:logs`

## Security Notes

1. Always use HTTPS in production
2. Keep JWT_SECRET secure
3. Never commit .env file
4. Regularly update dependencies