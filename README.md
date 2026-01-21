# IPTV Player

A modern IPTV player application with account management, M3U playlist support, and channel navigation. Built with Cloudflare Workers, D1 database, and React.

## Features

### Stage 1 (Current) - Authentication ✅
- User registration with email and username
- Secure login with JWT tokens
- Password validation and hashing
- Session management
- Protected routes

### Planned Features
- **Stage 2**: M3U playlist management (add, edit, delete playlists)
- **Stage 3**: M3U parsing and channel listing
- **Stage 4**: Video player integration and channel playback
- **Stage 5**: Advanced features (favorites, search, EPG)

## Tech Stack

### Backend
- **Cloudflare Workers**: Serverless API
- **Cloudflare D1**: SQLite database
- **Hono**: Fast web framework
- **bcryptjs**: Password hashing
- **jose**: JWT token management

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing

## Project Structure

```
iptv-player/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── auth.ts          # Authentication endpoints
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification middleware
│   │   ├── db/
│   │   │   └── queries.ts       # Database queries
│   │   ├── utils/
│   │   │   ├── jwt.ts           # JWT utilities
│   │   │   ├── password.ts      # Password hashing/validation
│   │   │   └── validation.ts    # Input validation
│   │   └── index.ts             # Main app entry
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   ├── wrangler.toml
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account (free tier works)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd iptv-player/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

4. **Create D1 database:**
   ```bash
   npx wrangler d1 create iptv-player-db
   ```

   Copy the database ID from the output and update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "iptv-player-db"
   database_id = "YOUR_DATABASE_ID_HERE"  # Replace with your database ID
   ```

5. **Run migrations locally:**
   ```bash
   npx wrangler d1 migrations apply iptv-player-db --local
   ```

6. **Set JWT secret (important for security):**
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
   Enter a strong random string (e.g., generate with `openssl rand -base64 32`)

7. **Start development server:**
   ```bash
   npm run dev
   ```

   Backend will run on `http://localhost:8787`

### Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
   ```bash
   cd iptv-player/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

   The default `.env` should work for local development:
   ```
   VITE_API_URL=http://localhost:8787/api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

## Usage

### Development

1. Start both backend and frontend servers (in separate terminals)
2. Navigate to `http://localhost:3000`
3. Register a new account
4. Login and access the dashboard

### Testing Authentication

**Register a new user:**
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Get current user (requires token):**
```bash
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Logout (invalidate token) | Yes |
| POST | `/api/auth/logout-all` | Logout from all devices | Yes |
| POST | `/api/auth/refresh` | Refresh access token | No |

## Database Schema

### Users Table
```sql
- id: TEXT (UUID)
- email: TEXT (unique)
- username: TEXT (unique)
- password_hash: TEXT
- created_at: INTEGER (timestamp)
- updated_at: INTEGER (timestamp)
```

### Playlists Table
```sql
- id: TEXT (UUID)
- user_id: TEXT (foreign key)
- name: TEXT
- m3u_url: TEXT
- created_at: INTEGER
- updated_at: INTEGER
- last_accessed: INTEGER
```

### Sessions Table
```sql
- id: TEXT (UUID)
- user_id: TEXT (foreign key)
- token: TEXT (refresh token)
- expires_at: INTEGER
- created_at: INTEGER
```

## Deployment

### Backend (Cloudflare Workers)

1. **Run migrations on production database:**
   ```bash
   npx wrangler d1 migrations apply iptv-player-db --remote
   ```

2. **Update production database ID in wrangler.toml:**
   ```toml
   [env.production]
   [[env.production.d1_databases]]
   binding = "DB"
   database_name = "iptv-player-db"
   database_id = "YOUR_PRODUCTION_DATABASE_ID"
   ```

3. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

### Frontend (Cloudflare Pages)

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Cloudflare Pages:**
   - Connect your GitHub repository to Cloudflare Pages
   - Set build command: `npm run build`
   - Set build output directory: `dist`
   - Set environment variable: `VITE_API_URL=https://your-worker.workers.dev/api`

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret
2. **Password Requirements**: Enforced by validation (8+ chars, mixed case, numbers, special chars)
3. **Rate Limiting**: Consider adding rate limiting to prevent brute force attacks
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Update CORS settings in production to restrict to your frontend domain

## Troubleshooting

### Backend Issues

**Database not found:**
- Ensure you've created the D1 database and updated `wrangler.toml`
- Run migrations: `npx wrangler d1 migrations apply iptv-player-db --local`

**JWT Secret error:**
- Set the JWT_SECRET: `npx wrangler secret put JWT_SECRET`
- For local dev, add to `.dev.vars` file in backend directory

### Frontend Issues

**API connection refused:**
- Ensure backend is running on port 8787
- Check VITE_API_URL in `.env` file
- Verify proxy settings in `vite.config.ts`

**CORS errors:**
- Update CORS origin in `backend/src/index.ts` to match your frontend URL

## Next Steps

After completing Stage 1, the next steps are:

1. **Stage 2**: Implement playlist CRUD operations
   - Add playlist management UI
   - Create API endpoints for playlist operations
   - Test M3U URL validation

2. **Stage 3**: M3U parsing and channel listing
   - Implement M3U parser
   - Display channels from playlist
   - Add channel search/filter

3. **Stage 4**: Video player integration
   - Integrate video.js or similar player
   - Implement channel switching
   - Add playback controls

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
