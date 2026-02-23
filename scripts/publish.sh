#!/bin/bash

set -e

echo "🚀 Starting BridgeBase monorepo publish workflow..."
echo ""

# Step 1: Verify clean git state (optional but recommended)
if [ "$1" != "--skip-git-check" ]; then
    if ! git diff --quiet; then
        echo "❌ Working directory has uncommitted changes. Commit first."
        exit 1
    fi
fi

# Step 2: Build
echo "🔨 Building all packages..."
npm run build
echo "✅ Build complete"
echo ""

# Step 3: Type check
echo "🔍 Type checking..."
npm run type-check
echo "✅ Type check passed"
echo ""

# Step 4: Run tests
echo "🧪 Running tests..."
npm run test
echo "✅ Tests passed"
echo ""

# Step 5: Dry run
echo "📋 Running dry-run publish..."
cd packages/core
npm publish --dry-run
cd ../..

cd packages/redis
npm publish --dry-run
cd ../..

cd packages/tigerbeetle
npm publish --dry-run
cd ../..
echo "✅ Dry-run successful"
echo ""

# Step 6: Confirm before publishing
read -p "Ready to publish to npm? (yes/no) " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Publish cancelled"
    exit 1
fi

# Step 7: Publish in dependency order
echo "📦 Publishing @bridgebase/core..."
cd packages/core
npm publish
cd ../..
echo "✅ Published @bridgebase/core"
echo ""

echo "⏳ Waiting 30 seconds for registry sync..."
sleep 30

echo "📦 Publishing @bridgebase/redis..."
cd packages/redis
npm publish
cd ../..
echo "✅ Published @bridgebase/redis"
echo ""

echo "⏳ Waiting 30 seconds for registry sync..."
sleep 30

echo "📦 Publishing @bridgebase/tigerbeetle..."
cd packages/tigerbeetle
npm publish
cd ../..
echo "✅ Published @bridgebase/tigerbeetle"
echo ""

echo "✨ All packages published successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Create git tag: git tag -a v0.2.0 -m 'Release v0.2.0'"
echo "  2. Push tag: git push origin v0.2.0"
echo "  3. Create GitHub release"