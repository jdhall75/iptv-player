# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modern IPTV player application with JWT authentication, M3U playlist support, and channel navigation. Dual architecture with Cloudflare Workers backend and React frontend.

**Current Status**:
- Stage 1 (Authentication) - ✅ Complete
- Stage 2 (Playlist Management) - ✅ Complete
- Stage 3 (M3U Parsing & Channel Listing) - ✅ Complete
- Stage 4 (Video Player) - ✅ Complete
- Stage 5 (Advanced Features) - ✅ Partial (Favorites & Categories done, EPG pending)

**Next Steps**: EPG (Electronic Program Guide) integration

## Development Commands

### Backend (Cloudflare Workers)
```bash
cd backend

# Development
npm run dev                    # Start Wrangler dev server (localhost:8787)
npm run test                   # Run Vitest tests
npm run test:api               # Run API integration tests (requires dev server running)

# Database
npm run db:migrate             # Apply migrations locally
npm run db:migrate:prod        # Apply migrations to production
npm run db:console             # Execute SQL commands locally

# Deployment
npm run deploy                 # Deploy to Cloudflare Workers
```

**API Testing**: The `test-api.sh` script provides comprehensive integration testing of all endpoints:
- Tests authentication (register, login, current user, logout)
- Tests playlist CRUD operations (create, read, update, delete)
- Tests authorization and input validation
- Auto-generates unique test users with timestamps
- Includes cleanup of test data

### Frontend (React + Vite)
```bash
cd frontend

# Development
npm run dev                    # Start Vite dev server (localhost:3000)
npm run build                  # Build for production
npm run preview                # Preview production build
npm run lint                   # Run ESLint
```

## Architecture

### Backend Structure (Cloudflare Workers + Hono)

**Key Pattern**: The backend uses Hono framework with D1 (SQLite) database. All routes follow a modular pattern and are mounted in `backend/src/index.ts:32`.

**Environment Bindings** (`backend/src/index.ts:6-11`):
- `DB`: D1Database - SQLite database binding
- `JWT_SECRET`: string - Secret for JWT signing (set via Wrangler secrets)
- `JWT_EXPIRES_IN`: string - Access token expiry (default: 15m)
- `REFRESH_TOKEN_EXPIRES_IN`: string - Refresh token expiry (default: 7d)

**Authentication Flow**:
1. User registers/logs in → `backend/src/routes/auth.ts`
2. Password hashing via bcryptjs → `backend/src/utils/password.ts`
3. JWT generation via jose library → `backend/src/utils/jwt.ts`
4. Session stored in D1 database → `backend/src/db/queries.ts:89-110`
5. Protected routes use `authMiddleware` → `backend/src/middleware/auth.ts:17`

**Database Pattern**: All database operations are abstracted in `backend/src/db/queries.ts`. Queries use D1's prepared statement API with parameter binding to prevent SQL injection.

**Token Strategy**:
- **Access Token**: Short-lived (15m), included in Authorization header
- **Refresh Token**: Long-lived (7d), stored in sessions table
- **Session Management**: Tokens tied to sessions in DB for revocation support

### Frontend Structure (React + TypeScript)

**Key Pattern**: Context-based authentication with protected routes. API calls centralized in `frontend/src/services/api.ts`.

**Authentication Context** (`frontend/src/context/AuthContext.tsx`):
- Manages user state and auth operations
- Provides `useAuth()` hook for components
- Automatically checks authentication on mount

**Protected Routes** (`frontend/src/components/ProtectedRoute.tsx`):
- Wraps routes requiring authentication
- Redirects to login if unauthenticated

**API Service Pattern**:
- Tokens stored in localStorage
- Automatic token inclusion in requests
- Centralized error handling

### Database Schema

**Users Table**:
- TEXT UUIDs as primary keys (generated via `generateUUID()`)
- Email is lowercased on storage for case-insensitive matching
- Passwords stored as bcrypt hashes (never plaintext)

**Sessions Table**:
- Links refresh tokens to users
- Tracks expiration for automatic cleanup
- Supports "logout all devices" via user_id deletion

**Playlists Table** (Stage 2 - ✅ Implemented):
- M3U URL storage per user
- Tracks creation, update, and last access timestamps
- Foreign key to users with CASCADE delete
- Indexed on user_id for efficient queries

**Favorites Table** (Stage 5 - ✅ Implemented):
- Stores user's favorite channels with full metadata
- Links to source playlist and optional category
- Foreign keys with CASCADE delete for cleanup

**Categories Table** (Stage 5 - ✅ Implemented):
- User-defined categories for organizing favorites
- Unique names per user
- Supports channel counts via JOIN queries

## Development Setup Notes

### First-Time Backend Setup
1. Create D1 database: `npx wrangler d1 create iptv-player-db`
2. Update `database_id` in `wrangler.toml` with returned ID
3. Run migrations: `npm run db:migrate`
4. Set JWT secret: `npx wrangler secret put JWT_SECRET` OR create `.dev.vars` file in backend/ with `JWT_SECRET=your-secret-here`

### Local Development Flow
1. Start backend: `cd backend && npm run dev` (port 8787)
2. Start frontend: `cd frontend && npm run dev` (port 3000)
3. Frontend proxies `/api` requests to backend via Vite config

### Environment Configuration
- **Backend**: Secrets via Wrangler CLI or `.dev.vars` file (not committed)
- **Frontend**: `.env` file with `VITE_API_URL=http://localhost:8787/api`

## Code Patterns & Conventions

### Adding New API Endpoints
1. Create route handler in `backend/src/routes/` (or add to existing)
2. Add database queries in `backend/src/db/queries.ts` if needed
3. Use `authMiddleware` for protected endpoints
4. Mount route in `backend/src/index.ts`
5. Add corresponding service method in `frontend/src/services/api.ts`

### Database Migrations
- Migration files in `backend/migrations/` numbered sequentially (e.g., `0001_`, `0002_`)
- Use foreign keys with `ON DELETE CASCADE` for referential integrity
- Always create indexes for frequently queried columns

### Validation Pattern
- Backend: Input validation in `backend/src/utils/validation.ts`
- Password requirements: 8+ chars, uppercase, lowercase, number, special char
- Email/username validation enforced before DB operations

### Error Handling
- Backend returns JSON with `success` boolean and `error` string
- Frontend displays errors from API responses
- HTTP status codes: 400 (validation), 401 (auth), 409 (conflict), 500 (server)

## Testing

### Backend Testing

**Unit Tests**:
- Test framework: Vitest
- Run: `cd backend && npm run test`
- Pattern: Create `*.test.ts` files adjacent to source files

**Integration Tests**:
- Script: `backend/test-api.sh`
- Run: `cd backend && npm run test:api`
- Prerequisites: Backend dev server must be running (`npm run dev`)
- Tests all API endpoints with full CRUD lifecycle
- Auto-generates test users to avoid conflicts
- Validates authentication, authorization, and error handling

## Security Notes

- **JWT_SECRET**: Must be set in production via `npx wrangler secret put JWT_SECRET`
- **CORS**: Currently set to `origin: '*'` in `backend/src/index.ts:16-20` - restrict in production
- **Password Hashing**: bcryptjs with salt rounds (check `backend/src/utils/password.ts`)
- **Session Revocation**: Sessions table enables token invalidation (logout/logout-all)
- **SQL Injection**: All queries use parameterized statements

## Known Configuration

- **Backend Port**: 8787 (Wrangler default)
- **Frontend Port**: 3000 (Vite config)
- **Database**: D1 (SQLite) with ID `aa3ccddc-8ad4-4c73-aa7a-5d85b27ce2bf`
- **Access Token Expiry**: 15 minutes
- **Refresh Token Expiry**: 7 days

## Implemented Features

**Stage 1**: Authentication ✅
- User registration with validation
- JWT-based authentication
- Session management with refresh tokens
- Protected routes

**Stage 2**: Playlist Management ✅
- Full CRUD operations for playlists
- M3U URL validation (must start with http:// or https://)
- Name validation (1-100 characters)
- Authorization checks (users can only modify their own playlists)
- Last accessed timestamp tracking
- Frontend UI with create/edit/delete functionality

**Stage 3**: M3U Parsing & Channel Listing ✅
- M3U parser utility (`backend/src/utils/m3u-parser.ts`)
- Extracts channel metadata (name, URL, logo, group) from EXTINF tags
- Channels API endpoint with search support (`backend/src/routes/channels.ts`)
- Frontend channel list with keyboard navigation (↑↓ arrows)
- Auto-load channel on pause (750ms delay for TV-style UX)
- Search/filter channels by name or group

**Stage 4**: Video Player ✅
- HLS.js integration for streaming (`frontend/src/components/HLSPlayer.tsx`)
- Native HLS fallback for Safari
- Full-screen video with channel overlay
- Auto-hiding UI after 5 seconds of inactivity
- Channel name display on switch

**Stage 5**: Advanced Features (Partial) ✅
- Favorites system with full CRUD (`backend/src/routes/favorites.ts`)
- User-defined categories for organizing favorites (`backend/src/routes/categories.ts`)
- Favorite toggle per channel in channel list
- Category filtering in favorites view
- Frontend pages: Favorites (`/favorites`), Categories (`/categories`)

## Future Development (Remaining)

**EPG Integration** (Electronic Program Guide):
- Fetch and parse EPG/XMLTV data
- Display program schedules
- Now/next program info overlay
- Program search and filtering
