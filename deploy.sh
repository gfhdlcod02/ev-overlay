#!/bin/bash
# One-Command Deployment Script for Smart EV Overlay
# Usage: ./deploy.sh

set -e

echo "🚀 Smart EV Overlay - Automated Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install: npm install -g pnpm"
    exit 1
fi

echo "✅ Prerequisites OK"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Build packages
echo -e "\n${YELLOW}Building packages...${NC}"
pnpm build

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
pnpm test

# Get KV namespace ID or create one
echo -e "\n${YELLOW}Setting up KV namespace...${NC}"
cd workers/api

KV_LIST=$(wrangler kv namespace list 2>/dev/null)
KV_ID=$(echo "$KV_LIST" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$KV_ID" ]; then
    echo "Creating KV namespace..."
    wrangler kv namespace create "ROUTE_CACHE"
    echo "⚠️ Please update workers/api/wrangler.toml with the namespace ID above"
    echo "Then run this script again."
    exit 1
fi

echo "✅ KV namespace found: $KV_ID"

# Update wrangler.toml if needed
if ! grep -q "$KV_ID" wrangler.toml; then
    echo "Updating wrangler.toml with KV namespace ID..."
    sed -i "s/id = \"[^\"]*\"/id = \"$KV_ID\"/" wrangler.toml
fi

# Deploy Worker
echo -e "\n${YELLOW}Deploying Cloudflare Worker...${NC}"
wrangler deploy

# Get Worker URL from wrangler output or toml
WORKER_NAME=$(grep '^name = ' wrangler.toml | head -1 | sed 's/name = "//;s/"$//')
WORKER_URL="https://$WORKER_NAME.workers.dev"

echo "✅ Worker deployed: $WORKER_URL"

# Update web app environment
cd ../../apps/web
echo -e "\n${YELLOW}Configuring web app...${NC}"
echo "VITE_API_URL=$WORKER_URL/api" > .env.production

# Build web app
echo -e "\n${YELLOW}Building web app...${NC}"
pnpm build

# Deploy to Pages
echo -e "\n${YELLOW}Deploying to Cloudflare Pages...${NC}"

PROJECT_NAME="ev-overlay"

# Try to deploy directly (creates project if needed)
wrangler pages deploy dist --project-name="$PROJECT_NAME" --branch="main" || {
    echo "Note: If this is your first deploy, create the project in Cloudflare Dashboard:"
    echo "https://dash.cloudflare.com/pages"
    echo ""
    echo "Then run this script again."
}

# Get Pages URL
PAGES_URL=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep -o 'https://[^[:space:]]*pages.dev' | head -1)

if [ -z "$PAGES_URL" ]; then
    PAGES_URL="https://$PROJECT_NAME.pages.dev"
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "🎉 Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "📱 Web App: ${GREEN}$PAGES_URL${NC}"
echo -e "🔌 API:     ${GREEN}$WORKER_URL${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test your app: $PAGES_URL"
echo "  2. Set up custom domain (optional)"
echo "  3. Configure analytics"
echo ""
