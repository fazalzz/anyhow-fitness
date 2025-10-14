# Google Cloud Run Deployment Script for Anyhow Fitness (PowerShell)
# This script handles the complete deployment to Google Cloud Run

Write-Host "🚀 Starting Google Cloud Run Deployment..." -ForegroundColor Green

# Set project and region
$PROJECT_ID = "anyhow-fitness-app"
$SERVICE_NAME = "anyhow-fitness-api"
$REGION = "us-central1"

# Build and deploy to Cloud Run
Write-Host "📦 Building and deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --concurrency 20 `
  --project $PROJECT_ID

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Deployment successful!" -ForegroundColor Green
  Write-Host "🌐 Service URL: https://$SERVICE_NAME-236180381075.us-central1.run.app" -ForegroundColor Cyan
} else {
  Write-Host "❌ Deployment failed!" -ForegroundColor Red
  exit 1
}

Write-Host "🎉 Google Cloud Run deployment complete!" -ForegroundColor Green