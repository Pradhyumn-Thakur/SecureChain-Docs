# Secure IPFS Backend Service

This backend service provides secure IPFS operations using Pinata without exposing API keys to the frontend.

## Security Features

- ✅ **Server-side API key management** - Pinata JWT stored securely on server
- ✅ **Signed JWT authentication** - Short-lived tokens (15 minutes)
- ✅ **Rate limiting** - Prevents abuse
- ✅ **CORS protection** - Restricts origins
- ✅ **Input validation** - Validates all requests
- ✅ **Helmet security headers** - Adds security headers
- ✅ **No client-side secrets** - Zero exposure of sensitive data

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
```

### 3. Required Environment Variables

Create a `.env` file with the following variables:

```env
# Pinata Configuration (REQUIRED)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_pinata_jwt_here

# Server Configuration
PORT=3001
NODE_ENV=production

# Security (REQUIRED)
JWT_SECRET=your_secure_random_jwt_secret_min_32_characters_long
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Generate Secure JWT Secret

Generate a secure JWT secret (minimum 32 characters):
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using openssl
openssl rand -hex 32

# Option 3: Using a strong password generator
# Use any strong password generator to create a 32+ character string
```

### 5. Get Pinata JWT Token

1. Create account at [Pinata.cloud](https://pinata.cloud)
2. Go to API Keys section
3. Create a new JWT token with full permissions
4. Copy the token to your `.env` file

### 6. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on port 3001 (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/token` - Get signed JWT for operations

### IPFS Operations
- `GET /api/ipfs/test` - Test connection
- `POST /api/ipfs/upload` - Upload encrypted file
- `GET /api/ipfs/retrieve/:cid` - Retrieve file
- `GET /api/ipfs/files` - List files
- `GET /api/ipfs/usage` - Get usage statistics
- `DELETE /api/ipfs/files/:cid` - Delete/unpin file

### Health Check
- `GET /health` - Server health status

## Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Rotate secrets regularly
- Use environment-specific configurations

### Network Security
- Use HTTPS in production
- Configure firewall rules
- Use reverse proxy (nginx/Apache)
- Enable fail2ban for DDoS protection

### Monitoring
- Monitor API usage and errors
- Set up alerts for unusual activity
- Log security events
- Regular security audits

## Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "ipfs-backend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker
```bash
# Build Docker image
docker build -t ipfs-backend .

# Run container
docker run -d \
  --name ipfs-backend \
  -p 3001:3001 \
  --env-file .env \
  ipfs-backend
```

### Environment-Specific Configurations

#### Development
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

#### Production
```env
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
PORT=3001
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**
   - Ensure all required variables are set in `.env`
   - Check variable names for typos

2. **"Failed to connect to Pinata"**
   - Verify your Pinata JWT token is valid
   - Check your Pinata account status

3. **CORS errors**
   - Ensure CORS_ORIGIN matches your frontend URL
   - Check for trailing slashes in URLs

4. **Rate limiting errors**
   - Adjust rate limiting settings if needed
   - Check for excessive requests

### Logs
```bash
# View PM2 logs
pm2 logs ipfs-backend

# View real-time logs
tail -f logs/app.log
```

## License

This project is part of the Blockchain Document Storage system.