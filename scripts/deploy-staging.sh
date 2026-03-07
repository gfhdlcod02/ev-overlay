#!/bin/bash
# Staging Deployment Script for EV Overlay
# Tasks: T051-T054

set -e

echo "🚀 Deploying EV Overlay to Staging Environment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_WORKER="ev-overlay-api-staging"
STAGING_DB="ev-overlay-staging"

echo -e "${YELLOW}Step 1: Building packages...${NC}"
pnpm version:sync
pnpm --filter @ev/core build

echo -e "${YELLOW}Step 2: Deploying API Worker to staging...${NC}"
cd workers/api

# Deploy with staging environment
wrangler deploy --env staging

echo -e "${GREEN}✓ Worker deployed to staging${NC}"

echo -e "${YELLOW}Step 3: Applying D1 migrations to staging...${NC}"
wrangler d1 migrations apply $STAGING_DB --env staging --remote

echo -e "${GREEN}✓ D1 migrations applied${NC}"

echo -e "${YELLOW}Step 4: Verifying deployment...${NC}"

# Health check
HEALTH_URL="https://$STAGING_WORKER.your-subdomain.workers.dev/api/health"
echo "Checking health endpoint: $HEALTH_URL"

for i in {1..5}; do
  if curl -s "$HEALTH_URL" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    break
  fi
  if [ $i -eq 5 ]; then
    echo -e "${RED}✗ Health check failed after 5 attempts${NC}"
    exit 1
  fi
  echo "Retrying in 5 seconds..."
  sleep 5
done

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Staging deployment complete!${NC}"
echo ""
echo "Staging URLs:"
echo "  API: https://$STAGING_WORKER.your-subdomain.workers.dev"
echo "  Health: $HEALTH_URL"
echo ""
echo "Next steps:"
echo "  1. Run integration tests: pnpm test:integration:staging"
echo "  2. Verify D1 connectivity"
echo "  3. Verify KV cache operations"
