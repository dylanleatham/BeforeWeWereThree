# Plan 03-01: User Setup Required

This plan requires external service configuration before real-time features will work.

## Azure SignalR Service

### Create the Service

1. Go to **Azure Portal** > **Create a resource**
2. Search for **SignalR Service**
3. Create with these settings:
   - **Resource Group:** Same as your App Service
   - **Name:** `bwwt-signalr` (or your preferred name)
   - **Region:** Same as your App Service
   - **Pricing Tier:** Free (sufficient for 2 concurrent connections)
   - **Service Mode:** Default

### Configure Settings

After creation, configure:

1. **Azure Portal** > **Your SignalR Service** > **Settings**
2. Verify **Service Mode** is set to **Default** (not Serverless)
3. Go to **CORS** section and add origins:
   - `http://localhost:5173` (local development)
   - `https://your-production-domain.com` (production)

### Get Connection String

1. **Azure Portal** > **Your SignalR Service** > **Keys**
2. Copy **Primary Connection String**
3. Add to your environment:

```bash
# Local development (.env file)
SIGNALR_CONNECTION_STRING="Endpoint=https://xxx.service.signalr.net;AccessKey=xxx;"

# Azure App Service
az webapp config appsettings set \
  --name your-app-name \
  --resource-group your-rg \
  --settings SIGNALR_CONNECTION_STRING="Endpoint=https://xxx.service.signalr.net;AccessKey=xxx;"
```

## Verification

After setup, verify the service works:

```bash
# Start the dev server
npm run dev

# In browser console (after authenticating), check for:
# - No "SignalR connection failed" errors
# - Connection state changes to "Connected"
```

## Notes

- The app will run without SIGNALR_CONNECTION_STRING but real-time features will be disabled
- The negotiate endpoint will return 503 if the env var is not set
- SignalR access tokens expire after 1 hour; automatic reconnection handles refresh
