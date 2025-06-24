# Google Cloud Run Setup Guide for MADE INFINITE

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud CLI** installed
3. **Docker** installed (optional, Cloud Build will handle this)
4. **Your service account key** (`made-infinite-music-38f8537d34e9.json`)

## Step 1: Google Cloud CLI Setup

```bash
# Install Google Cloud CLI (if not already installed)
# macOS:
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project ID (replace YOUR_PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
```

## Step 2: Find Your Project ID

```bash
# List your projects
gcloud projects list

# Set the correct project
gcloud config set project YOUR_ACTUAL_PROJECT_ID
```

## Step 3: Update Configuration Files

1. **Update `env.production`**:
   - Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID
   - Verify your bucket name: `made-infinite-bucket-2025`

2. **Verify your service account key**:
   - Ensure `made-infinite-music-38f8537d34e9.json` is in the project root
   - This file contains your Google Cloud credentials

## Step 4: Deploy to Cloud Run

### Option A: Automated Deployment (Recommended)
```bash
cd MADE_INFINITE
./deploy.sh
```

### Option B: Manual Deployment
```bash
cd MADE_INFINITE

# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Or build locally and deploy
docker build -t gcr.io/YOUR_PROJECT_ID/made-infinite .
docker push gcr.io/YOUR_PROJECT_ID/made-infinite
gcloud run deploy made-infinite \
  --image gcr.io/YOUR_PROJECT_ID/made-infinite \
  --platform managed \
  --region us-central1 \
  --memory 16Gi \
  --cpu 4 \
  --timeout 3600 \
  --allow-unauthenticated
```

## Step 5: Configure Environment Variables

After deployment, you need to set environment variables in Cloud Run:

```bash
# Set environment variables
gcloud run services update made-infinite \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,STORAGE_MODE=gcs,GCS_BUCKET_NAME=made-infinite-bucket-2025,ENABLE_STEM_PROCESSING=true,ADMIN_PASSWORD=admin123,SESSION_SECRET=Yourawaveydude4145!!!!"
```

## Step 6: Upload Service Account Key

You have two options for authentication:

### Option A: Environment Variable (Recommended for Cloud Run)
```bash
# Convert your service account key to base64
cat made-infinite-music-38f8537d34e9.json | base64

# Set as environment variable
gcloud run services update made-infinite \
  --region us-central1 \
  --set-env-vars="GOOGLE_CLOUD_CREDENTIALS=$(cat made-infinite-music-38f8537d34e9.json | base64 -w 0)"
```

### Option B: Service Account Attachment
```bash
# Get the service account email from your JSON file
# Then attach it to Cloud Run
gcloud run services update made-infinite \
  --region us-central1 \
  --service-account YOUR_SERVICE_ACCOUNT_EMAIL
```

## Step 7: Verify Deployment

1. **Get your service URL**:
   ```bash
   gcloud run services describe made-infinite --region us-central1 --format="value(status.url)"
   ```

2. **Test the application**:
   - Open the URL in your browser
   - Try uploading a music file
   - Test stem separation functionality

## Cloud Run Configuration Details

- **Memory**: 16GB (enough for Demucs)
- **CPU**: 4 cores
- **Timeout**: 60 minutes (for long stem processing)
- **Concurrency**: 1 request per instance (for memory-intensive tasks)
- **Min Instances**: 0 (scales to zero when not in use)
- **Max Instances**: 3 (prevents excessive costs)

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read made-infinite --region us-central1

# View metrics in console
echo "https://console.cloud.google.com/run/detail/us-central1/made-infinite/metrics?project=$(gcloud config get-value project)"
```

## Troubleshooting

### Common Issues:

1. **Memory Errors**: Increase memory allocation
2. **Timeout Errors**: Increase timeout or optimize processing
3. **Storage Errors**: Verify GCS bucket permissions
4. **Build Errors**: Check Docker build logs

### Debug Commands:
```bash
# Check service status
gcloud run services describe made-infinite --region us-central1

# View build history
gcloud builds list

# Check environment variables
gcloud run services describe made-infinite --region us-central1 --format="export" | grep env
```

## Cost Optimization

- Cloud Run scales to zero automatically
- You only pay for CPU/memory during processing
- Estimate: ~$0.10-0.50 per stem separation
- Monitor usage in Cloud Console

## Next Steps

1. Set up GitHub Actions for automatic deployment
2. Configure custom domain
3. Add monitoring and alerting
4. Optimize for production workloads

---

🎉 **Your MADE INFINITE music portal is now running on Google Cloud Run with full Demucs support!** 