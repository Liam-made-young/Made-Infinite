#!/bin/bash
# Google Cloud Run Deployment Script for MADE INFINITE

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MADE INFINITE - Google Cloud Run Deployment${NC}"
echo "================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not logged in to Google Cloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No Google Cloud project set. Please run:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}📋 Project ID: ${PROJECT_ID}${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️  Building and deploying...${NC}"
gcloud builds submit --config cloudbuild.yaml --substitutions=_PROJECT_ID=$PROJECT_ID

# Get the Cloud Run service URL
SERVICE_URL=$(gcloud run services describe made-infinite --region=us-central1 --format="value(status.url)")

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update your environment variables in Cloud Run console"
echo "2. Upload your service account key to Cloud Run"
echo "3. Test the stem separation functionality"
echo ""
echo -e "${GREEN}🔗 Cloud Run Console:${NC}"
echo "https://console.cloud.google.com/run/detail/us-central1/made-infinite/metrics?project=$PROJECT_ID" 