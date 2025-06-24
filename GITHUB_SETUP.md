# GitHub Actions Deployment Setup

## 🚀 Automatic Deployment from GitHub

This setup will automatically deploy your MADE INFINITE app to Google Cloud Run every time you push code to GitHub.

## Step 1: Add Google Cloud Credentials to GitHub

### 1.1 Get your service account key
You already have the file: `made-infinite-music-38f8537d34e9.json`

### 1.2 Convert to base64
Run this command to get the base64 version:
```bash
cat made-infinite-music-38f8537d34e9.json | base64
```

### 1.3 Add to GitHub Secrets
1. Go to your GitHub repository: https://github.com/Liam-made-young/Made-Infinite
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY`
5. Value: Paste the base64 output from step 1.2
6. Click **Add secret**

## Step 2: Push the GitHub Actions Workflow

```bash
# In your MADE_INFINITE directory
git add .
git commit -m "Add GitHub Actions deployment"
git push origin main
```

## Step 3: Watch the Deployment

1. Go to your GitHub repository
2. Click the **Actions** tab
3. You'll see the deployment running
4. Wait for it to complete (~5-10 minutes)
5. The deployment will show your app URL at the end

## 🎯 What This Deploys

- **Basic music portal** (without stem processing initially)
- **2GB RAM** - fits within free tier limits
- **Google Cloud Storage** integration
- **Auto-deployment** on every code push

## 🔧 Adding Stem Processing Later

Once the basic app is working, we can:
1. Increase memory limits
2. Add Demucs models
3. Enable stem processing features

## 📋 Environment Variables Set

The deployment automatically sets:
- `NODE_ENV=production`
- `STORAGE_MODE=gcs`
- `GCS_BUCKET_NAME=made-infinite-bucket-2025`
- `ENABLE_STEM_PROCESSING=false` (initially)

## 🚨 Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify GCP_SA_KEY secret is correct
- Ensure service account has proper permissions

### Quota Issues
- The workflow uses minimal resources (2GB RAM, 1 CPU)
- Should work within free tier limits

### Access Issues
- Verify your GCS bucket exists
- Check service account permissions

## 🎉 Success!

Once deployed, you'll have:
- ✅ **Live URL** for your music portal
- ✅ **Automatic deployments** from GitHub
- ✅ **Google Cloud Storage** integration
- ✅ **Scalable infrastructure**

Ready to add stem processing once the basic app is working! 