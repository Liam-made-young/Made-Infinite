# MADE INFINITE - Music Portal

A modern music streaming platform with Google Drive integration, Node.js backend, and cloud hosting support.

## 🎵 Features

- **Music Upload & Management**: Admin panel for uploading and managing music files
- **Google Drive Integration**: Unlimited storage through Google Drive API
- **Music Player**: Professional music player with playlist functionality
- **Real-time Updates**: Live synchronization across all users
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Theme switching support

## 🏗️ Architecture

```
Frontend (React-like) → Node.js Backend → Google Drive API → Cloud Storage
                    ↓                  ↓                ↓
                 Users            Authentication    Music Files
```

## 🚀 Setup Instructions

### 1. Google Drive API Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

#### Step 2: Create Service Account
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in service account details
4. Download the JSON key file
5. Rename it to `credentials.json` and place in project root

#### Step 3: Create Google Drive Folder
1. Create a folder in your Google Drive for music files
2. Right-click the folder → "Share"
3. Add your service account email (from credentials.json) with "Editor" access
4. Copy the folder ID from the URL (the long string after `/folders/`)

### 2. Local Development Setup

#### Prerequisites
- Node.js 18+ and npm
- Git

#### Installation
```bash
# Clone or download the project
cd MADE_INFINITE

# Install dependencies
npm install

# Create environment file
cp env-example.txt .env

# Edit .env with your configurations
nano .env
```

#### Environment Configuration (.env)
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Admin Authentication
ADMIN_PASSWORD=your-secure-password-here

# Google Drive API
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# Session Security
SESSION_SECRET=your-random-secret-key
```

#### Get Google OAuth Credentials
1. In Google Cloud Console → "Credentials"
2. Create "OAuth 2.0 Client ID"
3. Set authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Use the OAuth Playground to get refresh token:
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Configure to use your own OAuth credentials
   - Authorize Google Drive API scope
   - Exchange authorization code for tokens

#### Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

### 3. Hosting Platform Deployment

## Option A: Railway (Recommended)

Railway offers excellent Node.js hosting with environment variables support.

#### Setup Steps:
1. Create account at [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Deploy from GitHub:
   ```bash
   # Push code to GitHub first
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```
4. In Railway dashboard:
   - Connect GitHub repo
   - Add environment variables from your `.env`
   - Deploy automatically

#### Railway Configuration:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

## Option B: Vercel

Great for frontend-heavy applications with serverless functions.

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

## Option C: Heroku

Traditional cloud platform with add-ons support.

```json
// Procfile
web: node server.js
```

#### Heroku Deploy:
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set ADMIN_PASSWORD=your-password
heroku config:set GOOGLE_CLIENT_ID=your-client-id
# ... (set all environment variables)

# Deploy
git push heroku main
```

## Option D: DigitalOcean App Platform

Modern platform with automatic scaling.

```yaml
# .do/app.yaml
name: made-infinite
services:
- name: web
  source_dir: /
  github:
    repo: your-username/made-infinite
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
```

### 4. Production Considerations

#### Security
- Use strong admin passwords
- Enable HTTPS in production
- Set secure session cookies
- Rate limit API endpoints

#### Performance
- Enable gzip compression (already included)
- Use CDN for static assets
- Implement caching strategies
- Monitor server resources

#### Backup
- Regularly backup Google Drive folder
- Export database if using one
- Keep environment variables secure

## 📱 Usage

### For Admins:
1. Click "Admin" button
2. Enter admin password
3. Upload music files (up to 100MB each)
4. Manage uploaded files
5. Monitor storage usage

### For Users:
1. Browse music library
2. Click any song to open player
3. Use keyboard shortcuts:
   - `Space`: Play/Pause
   - `←`: Previous track
   - `→`: Next track
   - `Esc`: Close player

## 🔧 API Endpoints

- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/logout` - Admin logout
- `POST /api/upload` - Upload music file (admin only)
- `GET /api/files` - Get all music files
- `DELETE /api/files/:id` - Delete file (admin only)
- `GET /api/stream/:id` - Stream music file
- `GET /api/health` - Health check

## 🛠️ Development

### File Structure
```
MADE_INFINITE/
├── server.js              # Main Node.js server
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create from env-example.txt)
├── credentials.json       # Google Drive service account (not in repo)
├── public/                # Frontend files
│   ├── index.html        # Main HTML file
│   ├── style.css         # Styles
│   └── script.js         # Frontend JavaScript
├── README.md             # This file
└── env-example.txt       # Environment variables template
```

### Adding New Features
1. Backend: Add routes in `server.js`
2. Frontend: Update `public/script.js`
3. Styles: Modify `public/style.css`
4. Test locally before deploying

## 🌟 Deployment Comparison

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Railway** | Easy setup, Git integration, great for Node.js | Newer platform | $5/month |
| **Vercel** | Excellent performance, CDN, serverless | Function timeouts | Free tier available |
| **Heroku** | Mature platform, many add-ons | Expensive for higher tiers | $7/month |
| **DigitalOcean** | Good performance, predictable pricing | More manual setup | $5/month |

## 🎯 Recommended Setup

For the best experience, I recommend:

1. **Railway** for hosting (easy Node.js deployment)
2. **Google Drive** for storage (unlimited space)
3. **Custom domain** for professional look

This setup provides:
- ✅ Unlimited music storage
- ✅ Fast streaming performance
- ✅ Professional appearance
- ✅ Easy maintenance
- ✅ Cost-effective scaling

## 📞 Support

If you need help with setup:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure Google Drive API is properly configured
4. Test with smaller files first

## 🔄 Updates

To update the application:
1. Pull latest changes from repository
2. Run `npm install` for new dependencies
3. Update environment variables if needed
4. Redeploy to your hosting platform

---

**Made with ❤️ for music lovers** 