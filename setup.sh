#!/bin/bash

echo "🎬 IPTV Player Setup Script"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the iptv-player root directory"
    exit 1
fi

echo -e "${BLUE}Step 1: Installing backend dependencies...${NC}"
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 2: Creating backend .dev.vars file...${NC}"
if [ ! -f ".dev.vars" ]; then
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    echo "JWT_SECRET=$JWT_SECRET" > .dev.vars
    echo -e "${GREEN}✓ Created .dev.vars with random JWT secret${NC}"
else
    echo -e "${YELLOW}⚠ .dev.vars already exists, skipping${NC}"
fi
echo ""

cd ..

echo -e "${BLUE}Step 3: Installing frontend dependencies...${NC}"
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 4: Creating frontend .env file...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi
echo ""

cd ..

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Setup Cloudflare D1 database:"
echo -e "   ${BLUE}cd backend${NC}"
echo -e "   ${BLUE}npx wrangler login${NC}"
echo -e "   ${BLUE}npx wrangler d1 create iptv-player-db${NC}"
echo "   Then update wrangler.toml with your database ID"
echo ""
echo "2. Run database migrations:"
echo -e "   ${BLUE}npx wrangler d1 migrations apply iptv-player-db --local${NC}"
echo ""
echo "3. Start the backend (in one terminal):"
echo -e "   ${BLUE}cd backend && npm run dev${NC}"
echo ""
echo "4. Start the frontend (in another terminal):"
echo -e "   ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo "5. Open your browser to http://localhost:3000"
echo ""
echo "For more details, see README.md"
