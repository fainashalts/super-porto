#!/bin/bash

echo "🔧 Setting up Porto Superchain Extension Demo..."

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Forge not found. Please install Foundry first:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq not found. Please install jq:"
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt-get install jq"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Compile the SimpleGreeter contract
echo "🔨 Compiling SimpleGreeter contract..."
forge build --contracts src/contracts/SimpleGreeter.sol

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed"
    exit 1
fi

# Extract bytecode and ABI
echo "📦 Extracting contract artifacts..."
jq -r '.bytecode.object' out/SimpleGreeter.sol/SimpleGreeter.json > src/contracts/SimpleGreeter.bytecode.json
jq -r '.abi' out/SimpleGreeter.sol/SimpleGreeter.json > src/contracts/SimpleGreeter.abi.json

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env template..."
    cat > .env << EOF
# Demo Private Key (DO NOT use in production)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract addresses (these will be filled when you deploy)
PORTO_IMPL_ADDRESS_A=0x...
PORTO_IMPL_ADDRESS_B=0x...
TEST_TOKEN_ADDRESS_A=0x...
TEST_TOKEN_ADDRESS_B=0x...
EOF
    echo "📝 Created .env template. Update the addresses after deploying contracts."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete! Now you can:"
echo ""
echo "1. 🚀 Start Supersim:"
echo "   ./supersim --interop.autorelay"
echo ""
echo "2. 🧪 Run the real demo:"
echo "   npm run real-demo"
echo ""
echo "3. 🔍 Or run the simulated demo:"
echo "   npm run demo"
echo ""
echo "💡 Make sure Supersim is running before starting the demo!" 