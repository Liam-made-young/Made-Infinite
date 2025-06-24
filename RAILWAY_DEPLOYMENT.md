# Railway Deployment Guide

## Docker-Based Deployment with Stem Processing

This deployment includes full stem processing capabilities using Demucs and FFmpeg.

## Required Environment Variables

Set these in your Railway project settings:

### Essential
- `NODE_ENV=production`
- `ADMIN_PASSWORD=your_secure_password_here`
- `SESSION_SECRET=your_secure_session_secret_here`
- `ENABLE_STEM_PROCESSING=true`

### Google Cloud Storage (Recommended)
- `STORAGE_MODE=gcs`
- `GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}` (entire JSON as string)
- `GCS_BUCKET_NAME=your-bucket-name`

### Alternative: Cloudinary
- `STORAGE_MODE=cloudinary`
- `CLOUDINARY_CLOUD_NAME=your_cloud_name`
- `CLOUDINARY_API_KEY=your_api_key`
- `CLOUDINARY_API_SECRET=your_api_secret`

## Deployment Steps

1. Push your code to GitHub (including Dockerfile)
2. Connect Railway to your GitHub repo
3. Set environment variables in Railway dashboard
4. Deploy! (Railway will automatically use Docker)

## What's Included

- ✅ **Node.js 18** - Runtime environment
- ✅ **Python 3** - For Demucs stem processing
- ✅ **FFmpeg** - Audio processing library
- ✅ **PyTorch CPU** - Machine learning framework
- ✅ **Demucs** - AI-powered stem separation
- ✅ **Full stem processing** - 4-stem separation (vocals, drums, bass, other)

## Health Check

The app includes a health check endpoint at `/api/health` for Railway monitoring.

## File Upload Limits

- Google Cloud Storage: 500MB
- Cloudinary: 200MB
- Demo mode: 200MB

## Build Time

Initial deployment may take 5-10 minutes due to Python dependencies installation. 