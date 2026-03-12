#!/bin/sh
# Build the auth app with production env and refresh auth-build for deploy.
# Run from project root: sh website/scripts/build-auth-for-production.sh
# Or from website/: sh scripts/build-auth-for-production.sh
#
# Vite uses .env.production when running "npm run build", so ensure
# website/auth/.env.production has VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

set -e
cd "$(dirname "$0")/.."
echo "Building auth app (production)..."
cd auth
npm run build
cd ..
sh scripts/prepare-auth-deploy.sh
echo "Done. Commit and push website/auth-build/ to update the live /auth page."
