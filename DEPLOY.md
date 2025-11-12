# Deployment Guide for Render.com

This guide will help you deploy the SIA Challenge 2025 application on Render.com.

## Prerequisites

1. An account on [Render.com](https://render.com)
2. The project code in a Git repository (GitHub, GitLab, or Bitbucket)
3. Node.js 18+ (Render detects this automatically)

## Deployment Steps

### 1. Prepare Repository

Make sure your code is in a Git repository and all necessary files are committed:

```bash
git add .
git commit -m "add config for Render deployment"
git push origin main
```

### 2. Create a New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** and select **"Web Service"**
3. Connect your repository (GitHub/GitLab/Bitbucket)
4. Select the repository containing this project

### 3. Configure the Service

Render can use the `render.yaml` file automatically, or you can configure manually:

#### Option A: Use render.yaml (Recommended)

If you use the included `render.yaml` file, Render will automatically detect the configuration. You only need to:

1. Select the repository
2. Render will detect the `render.yaml` and apply the configuration

#### Option B: Manual Configuration

If you prefer to configure manually, use these values:

- **Name**: `sia-challenge-2025` (or any name you prefer)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: `Free` (or the plan you prefer)

### 4. Environment Variables

Render will automatically configure:
- `NODE_ENV=production`
- `PORT=3000` (Render assigns the port automatically, but this is a fallback)

You don't need to configure additional environment variables for this application.

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will begin to:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Run the build (`npm run build`)
   - Start the server (`npm run start:prod`)

### 6. Verify Deployment

Once deployment is complete:

1. Render will provide you with a URL (e.g., `https://sia-challenge-2025.onrender.com`)
2. Visit the URL to verify the application works
3. Visit `/health` to verify the server status
4. Test the WebSocket functionality

## Build Structure

The build process generates:

- `dist/server.js` - Server transpiled to ES5 (ES Modules)
- `dist/public/` - Copied static files
- `dist/public/client.js` - Client transpiled to ES5

## Troubleshooting

### Build fails

- Verify that all dependencies are in `package.json`
- Check the build logs in Render Dashboard
- Make sure `node_modules` is in `.gitignore`

### Server doesn't start

- Verify that the `start:prod` command is correct
- Check the service logs in Render Dashboard
- Make sure `dist/server.js` exists after the build

### WebSocket doesn't work

- Render supports WebSockets automatically
- Make sure to use `wss://` in production (HTTPS)
- Verify that the server is listening on the correct port

### 404 error on static files

- Verify that `dist/public/` was copied correctly
- Check the server configuration for serving static files
- Make sure the build completed successfully

## Updating Deployment

Every time you push to the main branch (main/master), Render will automatically:

1. Detect the changes
2. Run the build
3. Restart the service with the new code

You can disable auto-deploy from the Dashboard if you prefer to do it manually.

## Important Notes

- **Free Plan**: Render may put the service to "sleep" after 15 minutes of inactivity. The first request after sleep may take ~30 seconds.
- **WebSockets**: Work correctly on Render, but the service must be active.
- **HTTPS**: Render provides HTTPS automatically for all services.
- **Port**: Render assigns the port automatically through the `PORT` environment variable.

## Useful Commands

```bash
# Local build to verify
npm run build

# Test the production server locally
npm run start:prod

# Verify that dist/ was generated correctly
ls -la dist/
ls -la dist/public/
```

## Support

If you encounter problems:

1. Check the logs in Render Dashboard
2. Verify that the build works locally
3. Consult the [Render documentation](https://render.com/docs)
