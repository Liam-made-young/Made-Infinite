# Google Drive API Setup Guide

## 🎯 Overview
This guide will help you set up Google Drive API access for your music portal. You'll get the credentials needed to store and stream music files through Google Drive.

## 📋 What You'll Get
- Google Client ID
- Google Client Secret  
- Google Refresh Token
- Service Account Credentials

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Enter project name: `made-infinite-music`
   - Click "Create"

3. **Wait for Project Creation**
   - Usually takes 10-30 seconds
   - You'll get a notification when ready

### Step 2: Enable Google Drive API

1. **Navigate to APIs & Services**
   - Left sidebar → "APIs & Services" → "Library"

2. **Search for Google Drive API**
   - Search: "Google Drive API"
   - Click on "Google Drive API"
   - Click "Enable"

3. **Verify API is Enabled**
   - Go to "APIs & Services" → "Enabled APIs"
   - You should see "Google Drive API" listed

### Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials Page**
   - Left sidebar → "APIs & Services" → "Credentials"

2. **Create OAuth Client ID**
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     * Choose "External" user type
     * Fill in app name: "MADE INFINITE Music Portal"
     * Add your email as developer contact
     * Save and continue through the steps

3. **Configure OAuth Client**
   - Application type: "Web application"
   - Name: "MADE INFINITE Web Client"
   - Authorized redirect URIs:
     * Add: `http://localhost:3000/auth/google/callback`
     * Add: `https://yourdomain.com/auth/google/callback` (for production)

4. **Download Credentials**
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**
   - Download the JSON file (optional backup)

### Step 4: Get Refresh Token

1. **Use OAuth 2.0 Playground**
   - Visit: https://developers.google.com/oauthplayground/

2. **Configure Playground**
   - Click gear icon (⚙️) in top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Close settings

3. **Authorize APIs**
   - In left panel, find "Drive API v3"
   - Select: `https://www.googleapis.com/auth/drive`
   - Click "Authorize APIs"
   - Sign in and grant permissions

4. **Exchange Authorization Code**
   - Click "Exchange authorization code for tokens"
   - Copy the **Refresh Token** (save this!)

### Step 5: Create Service Account (Alternative Method)

If you prefer service account authentication:

1. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service account"
   - Enter name: "made-infinite-service"
   - Create and continue

2. **Download Key File**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose JSON format
   - Download and save as `credentials.json`

3. **Share Drive Folder**
   - Create a folder in Google Drive
   - Right-click → Share
   - Add the service account email (from credentials.json)
   - Give "Editor" permissions

### Step 6: Create Google Drive Folder

1. **Create Music Folder**
   - Go to https://drive.google.com/
   - Click "New" → "Folder"
   - Name: "MADE INFINITE Music"

2. **Get Folder ID**
   - Open the folder
   - Copy ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Save the FOLDER_ID_HERE part

3. **Set Permissions**
   - Right-click folder → "Share"
   - Add service account email with "Editor" access
   - Or make folder publicly viewable (less secure)

## 🔧 Your Final Credentials

After completing all steps, you should have:

```env
# OAuth Method (Recommended)
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REFRESH_TOKEN=1//04-your-refresh-token-here
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j

# Alternative: Service Account Method
# Place credentials.json file in project root
```

## 🔒 Security Best Practices

1. **Keep Secrets Private**
   - Never commit Client Secret to GitHub
   - Use environment variables in production
   - Rotate keys if compromised

2. **Limit Scope**
   - Only request necessary Drive permissions
   - Use service accounts for server-side access
   - Monitor API usage in Google Cloud Console

3. **Production Setup**
   - Add your actual domain to authorized URIs
   - Use HTTPS in production
   - Set up proper CORS policies

## 🚨 Troubleshooting

### "Error: redirect_uri_mismatch"
- Add your exact redirect URI to OAuth client
- Include both http://localhost:3000 and your production URL

### "Error: invalid_grant"
- Refresh token may have expired
- Regenerate refresh token using OAuth playground

### "Error: insufficient permissions"
- Make sure service account has access to Drive folder
- Check that API scopes include drive access

### "Error: API not enabled"
- Enable Google Drive API in Google Cloud Console
- Wait a few minutes for changes to propagate

## 🎵 Ready to Test!

Once you have all credentials:

1. **Update your .env file**:
   ```bash
   node setup.js
   ```

2. **Start the server**:
   ```bash
   npm install
   npm run dev
   ```

3. **Test upload**:
   - Go to http://localhost:3000
   - Login as admin
   - Try uploading a music file

4. **Check Google Drive**:
   - Verify file appears in your Drive folder
   - Test streaming from the web interface

## 📞 Need Help?

If you get stuck:
1. Check Google Cloud Console for error messages
2. Verify all APIs are enabled
3. Double-check folder permissions
4. Test with a small audio file first

---

**🎵 Ready to stream unlimited music!** 