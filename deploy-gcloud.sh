#!/bin/bash

# Google Cloud Run Deployment Script for Anyhow Fitness
# This script handles the complete deployment to Google Cloud Run

echo "🚀 Starting Google Cloud Run Deployment..."

# Set project and region
PROJECT_ID="anyhow-fitness-app"
SERVICE_NAME="anyhow-fitness-api"
REGION="us-central1"

# Build and deploy to Cloud Run
echo "📦 Building and deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --concurrency 20 \
  --project $PROJECT_ID

if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "🌐 Service URL: https://$SERVICE_NAME-236180381075.us-central1.run.app"
else
  echo "❌ Deployment failed!"
  exit 1
fi

echo "🎉 Google Cloud Run deployment complete!"