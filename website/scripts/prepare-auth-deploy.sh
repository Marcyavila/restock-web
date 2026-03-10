#!/bin/sh
# Copies the built auth app into website/auth-build so /auth is served correctly.
# Run from project root: sh website/scripts/prepare-auth-deploy.sh
# Or from website/: sh scripts/prepare-auth-deploy.sh

set -e
cd "$(dirname "$0")/.."
AUTH_DIR="auth"
BUILD_DIR="auth-build"

if [ ! -d "$AUTH_DIR/dist" ]; then
  echo "Run 'cd $AUTH_DIR && npm run build' first."
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp "$AUTH_DIR/dist/index.html" "$BUILD_DIR/"
cp -r "$AUTH_DIR/dist/assets" "$BUILD_DIR/"
echo "Done. $BUILD_DIR/ is ready. Deploy the website folder (e.g. push to Vercel)."
