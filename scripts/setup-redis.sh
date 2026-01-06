#!/bin/bash
# Quick Redis setup script for Meowsica Discord Bot

set -e

echo "🚀 Meowsica Redis Setup"
echo "========================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if Redis container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^meowsica-redis$"; then
    echo "⚠️  Redis container 'meowsica-redis' already exists"
    read -p "Do you want to remove it and create a new one? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing container..."
        docker rm -f meowsica-redis > /dev/null 2>&1 || true
    else
        echo "ℹ️  Using existing container"
        echo ""
        echo "To start Redis: docker-compose up -d"
        echo "To stop Redis: docker-compose down"
        exit 0
    fi
fi

# Start Redis using docker-compose
echo "🐳 Starting Redis with Docker Compose..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker exec meowsica-redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""
echo "📊 Redis Status:"
docker-compose ps redis

echo ""
echo "🧪 Testing Redis connection..."
if docker exec meowsica-redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis connection test successful!"
else
    echo "❌ Redis connection test failed"
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with:"
echo "   ENABLE_SHARDING=true"
echo "   ENABLE_REDIS=true"
echo "   REDIS_URL=redis://localhost:6379"
echo ""
echo "2. Start your bot:"
echo "   bun run start"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f redis"
echo "  - Stop Redis: docker-compose down"
echo "  - Restart Redis: docker-compose restart redis"
echo "  - Monitor Redis: docker exec -it meowsica-redis redis-cli MONITOR"

