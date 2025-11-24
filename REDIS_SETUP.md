# Redis Environment Variables Setup

## Production (Render + Upstash Redis)

Add these environment variables in your Render dashboard:

```bash
REDIS_URL=https://romantic-weasel-8052.upstash.io
REDIS_TOKEN=AR90AAImcDI5MzRkYmJmMWI1NzA0MmFmYTc1MjJiNjU4ODRkY2FmNnAyODA1Mg
```

## Development (Local Redis)

Your local `.env` file already contains:

```bash
REDIS_HOST=redis-15257.c305.us-east-1-mz2.ec2.cloud.redislabs.com
REDIS_PORT=15257
REDIS_PASSWORD=Ia2hTmHqQe8iY2n3K4sR7vP9cF5jL8mN
```

## How It Works

The Redis service automatically detects which configuration to use:

- **If `REDIS_TOKEN` exists** → Uses Upstash Redis (production)
- **If no `REDIS_TOKEN`** → Uses local Redis (development)
- **If `REDIS_ENABLED=false`** → Disables Redis completely

## Upstash Redis Setup Steps

1. **Create Upstash Redis Database**:
   - Go to [Upstash Console](https://console.upstash.com/)
   - Create a new Redis database
   - Select the closest region to your Render deployment

2. **Get Connection Details**:
   - Copy the REST URL → `REDIS_URL`
   - Copy the REST Token → `REDIS_TOKEN`

3. **Add to Render**:
   - In your Render service settings
   - Add Environment Variables:
     - `REDIS_URL`: Your Upstash URL
     - `REDIS_TOKEN`: Your Upstash token

## Benefits of Upstash Redis

✅ **Serverless**: No connection management needed  
✅ **HTTP-based**: Works with Vercel/Netlify functions  
✅ **Global Edge**: Low latency worldwide  
✅ **Pay-per-use**: Cost-effective for startups  
✅ **Automatic scaling**: Handles traffic spikes  

## Local Development Options

### Option 1: Use Redis Cloud (Current)
Your current setup uses Redis Cloud - perfect for development.

### Option 2: Local Redis Instance
Install Redis locally:
```bash
# Windows (WSL)
sudo apt-get install redis-server
redis-server

# macOS
brew install redis
brew services start redis

# Set env vars:
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD= (if no password)
```

### Option 3: Docker Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

## Testing the Setup

```bash
# Test locally
npm run dev

# Check Redis connection logs
# Should show: "🏠 Using local Redis for development"

# After deploying to Render
# Should show: "🚀 Using Upstash Redis for production"
```

## Troubleshooting

### Production Issues
- Verify `REDIS_URL` and `REDIS_TOKEN` are correct in Render
- Check Upstash database is active
- Ensure no firewall restrictions

### Development Issues
- Verify Redis Cloud credentials are valid
- Check network connectivity
- Try local Redis if cloud Redis fails

### Disabling Redis
If Redis causes issues, disable it temporarily:
```bash
REDIS_ENABLED=false
```
The app will continue working without caching.

## Migration Notes

- **Data is not migrated** between local and production Redis
- **Cache keys are prefixed** to avoid conflicts
- **Session storage** works seamlessly in both environments
- **All Redis features** work except pattern deletion in Upstash

The application will automatically use the appropriate Redis configuration based on the environment variables you provide.