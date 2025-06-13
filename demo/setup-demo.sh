#!/bin/bash

echo "🌉 Setting up Porto Superchain Demo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. You have $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if optional dependencies are available
echo "🔍 Checking optional dependencies..."

if npm list framer-motion &> /dev/null; then
    echo "✅ Framer Motion found - animations enabled"
else
    echo "⚠️  Framer Motion not found - using basic animations"
fi

if npm list lucide-react &> /dev/null; then
    echo "✅ Lucide React found - real icons enabled"
else
    echo "⚠️  Lucide React not found - using emoji icons"
fi

if npm list recharts &> /dev/null; then
    echo "✅ Recharts found - charts enabled"
else
    echo "⚠️  Recharts not found - using simplified charts"
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local..."
    cat > .env.local << EOF
# Porto Superchain Demo Configuration
NEXT_PUBLIC_DEMO_MODE=development
NEXT_PUBLIC_ANIMATION_SPEED=1
NEXT_PUBLIC_ENABLE_SOUND=false
EOF
    echo "✅ Created .env.local"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the demo:"
echo "   npm run dev"
echo ""
echo "📖 Then open: http://localhost:3000"
echo ""
echo "🎯 Demo Features:"
echo "   ✅ EIP-7702 delegation flow"
echo "   ✅ Superchain portfolio management"
echo "   ✅ Real-time operation monitoring"
echo "   ✅ Cross-chain rebalancing simulation"
echo ""
echo "🎪 For presentations:"
echo "   • Use fullscreen mode (F11)"
echo "   • Demo flows from setup → results"
echo "   • Emphasize 'one permission, many chains'"
echo ""
echo "💡 Tip: Install optional dependencies for enhanced experience:"
echo "   npm install framer-motion lucide-react recharts" 