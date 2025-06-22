# 🌩️ Google Cloud Storage Setup Guide

## Benefits of Google Cloud Storage:
- **File size limit**: Up to 5TB per file (vs 100MB Cloudinary free)
- **Cost**: Pay only for what you use (~$0.02/GB/month)
- **Performance**: Global CDN available
- **Reliability**: 99.999999999% durability

## Step 1: Create Google Cloud Project (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Create Project"
3. Enter project name: `made-infinite-music`
4. Click "Create"

## Step 2: Enable Cloud Storage API (30 seconds)

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Cloud Storage API"
3. Click "Enable"

## Step 3: Create Storage Bucket (1 minute)

1. Go to "Cloud Storage" > "Buckets"
2. Click "Create Bucket"
3. Bucket name: `made-infinite-music-bucket` (must be globally unique)
4. Choose location: `us-central1` (or closest to your users)
5. Storage class: `Standard`
6. Access control: `Fine-grained`
7. Click "Create"

## Step 4: Create Service Account (2 minutes)

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `made-infinite-storage`
4. Click "Create and Continue"
5. Add role: "Storage Admin"
6. Click "Continue" > "Done"

## Step 5: Generate Service Account Key (1 minute)

1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON"
5. Download the key file
6. **Keep this file secure!**

## Step 6: Configure Your App

### Option A: Local Development
1. Place the JSON key file in your project root
2. Update your `.env` file:

```env
STORAGE_MODE=gcs
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEYFILE=./path-to-your-key.json
GCS_BUCKET_NAME=made-infinite-music-bucket
```

### Option B: Railway/Heroku Deployment
1. Copy the entire contents of your JSON key file
2. Set environment variables:

```env
STORAGE_MODE=gcs
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
GCS_BUCKET_NAME=made-infinite-music-bucket
```

## Step 7: Test Your Setup

1. Restart your server: `npm start`
2. You should see: `🌩️ Google Cloud Storage configured successfully`
3. Try uploading a file through your admin panel
4. Check your GCS bucket - the file should appear!

## Pricing Estimate

For a music portal with moderate usage:
- **Storage**: $0.02/GB/month
- **Operations**: $0.05/10,000 operations
- **Network**: $0.12/GB egress

**Example**: 100GB of music + 10,000 plays/month = ~$3/month

## Troubleshooting

**"Bucket not found" error:**
- Check bucket name in environment variables
- Ensure bucket exists in GCS console

**"Authentication failed" error:**
- Verify service account has Storage Admin role
- Check JSON key file is valid
- For Railway: ensure GOOGLE_CLOUD_CREDENTIALS is properly formatted

**"Permission denied" error:**
- Service account needs Storage Admin role
- Bucket permissions may be too restrictive

## Security Notes

- Never commit your service account key to version control
- Use environment variables for all credentials
- Consider using IAM conditions for additional security
- Regularly rotate service account keys 