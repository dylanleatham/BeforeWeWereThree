# Azure Front Door Setup Guide

This guide configures Azure Front Door Standard tier with custom domain, managed SSL certificate, and origin routing to App Service.

## Prerequisites

- Azure App Service deployed and running (bwwt-app)
- Custom domain registered (beforewewerethree.com)
- Azure CLI installed and authenticated
- Porkbun account with DNS management access

## 1. Create Front Door Profile

### Azure Portal

1. Navigate to **Create a resource** > **Front Door and CDN profiles**
2. Select **Azure Front Door** (not Classic)
3. Configuration:
   - **Subscription:** Your subscription
   - **Resource group:** bwwt-rg
   - **Name:** bwwt-fd
   - **Tier:** Standard (supports managed certificates)
   - **Endpoint name:** bwwt-endpoint
   - **Origin type:** App Service
   - **Origin host name:** bwwt-app.azurewebsites.net
4. Click **Review + create** > **Create**

### Azure CLI Alternative

```bash
# Create Front Door profile
az afd profile create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --sku Standard_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --endpoint-name bwwt-endpoint \
  --enabled-state Enabled

# Create origin group with health probe
az afd origin-group create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --origin-group-name bwwt-origin-group \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-path /api/health \
  --probe-interval-in-seconds 30 \
  --sample-size 4 \
  --successful-samples-required 3

# Add App Service as origin
az afd origin create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --origin-group-name bwwt-origin-group \
  --origin-name bwwt-app-origin \
  --host-name bwwt-app.azurewebsites.net \
  --origin-host-header bwwt-app.azurewebsites.net \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled
```

## 2. Configure Origin Group

### Settings

| Setting | Value | Reason |
|---------|-------|--------|
| Health probe path | /api/health | Matches Express health endpoint |
| Health probe protocol | HTTPS | Secure health checks |
| Probe interval | 30 seconds | Balance between responsiveness and cost |
| Session affinity | Disabled | Stateless JWT auth, no sticky sessions needed |

### Azure Portal

1. Open **bwwt-fd** profile
2. Navigate to **Origin groups** > **bwwt-origin-group**
3. Verify App Service origin is configured
4. Confirm health probe settings match above

## 3. Add Custom Domain

### Step 3a: Add Domain in Front Door

**Azure Portal:**
1. Open **bwwt-fd** profile
2. Navigate to **Domains** > **+ Add**
3. Configuration:
   - **Domain type:** Non-Azure pre-validated domain
   - **DNS management:** All other DNS services
   - **Custom domain:** beforewewerethree.com
4. Note the **TXT validation record** displayed (format: `_dnsauth.beforewewerethree.com`)
5. Click **Add** (domain will show "Pending" until DNS validated)

**Azure CLI:**
```bash
# Add custom domain
az afd custom-domain create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --custom-domain-name beforewewerethree-com \
  --host-name beforewewerethree.com \
  --certificate-type ManagedCertificate \
  --minimum-tls-version TLS12

# Get validation token (note this for DNS step)
az afd custom-domain show \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --custom-domain-name beforewewerethree-com \
  --query "validationProperties.validationToken" -o tsv
```

### Step 3b: Configure DNS in Porkbun

1. Log in to Porkbun > **Domain Management** > **beforewewerethree.com** > **DNS**

2. **Add TXT record for domain verification:**
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | TXT | _dnsauth | [validation token from Azure] | 300 |

3. **Add CNAME record for www subdomain:**
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | CNAME | www | bwwt-endpoint.azurefd.net | 300 |

4. **For apex domain (beforewewerethree.com):**

   Porkbun supports ALIAS records for apex domains:
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | ALIAS | @ | bwwt-endpoint.azurefd.net | 300 |

   If ALIAS not available, create www redirect:
   - Set up URL redirect from @ to https://www.beforewewerethree.com

5. Save DNS changes and wait for propagation (typically 5-30 minutes)

### Step 3c: Verify Domain in Azure

1. Return to Azure Portal > **bwwt-fd** > **Domains**
2. Click **Validate** on the pending domain
3. Wait for status to change to **Approved**
4. Certificate provisioning begins automatically (10-30 minutes)

**Azure CLI verification:**
```bash
# Check domain validation status
az afd custom-domain show \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --custom-domain-name beforewewerethree-com \
  --query "{status:domainValidationState,cert:tlsSettings.certificateType}"
```

## 4. Create Routing Rules

### Azure Portal

1. Open **bwwt-fd** > **Front Door manager**
2. Click **+ Add a route**
3. Configuration:
   - **Name:** default-route
   - **Domains:** beforewewerethree.com
   - **Patterns to match:** /*
   - **Origin group:** bwwt-origin-group
   - **Forwarding protocol:** HTTPS only
   - **Redirect:** Enable HTTP to HTTPS redirect
   - **Caching:** Enable for static assets

### Azure CLI

```bash
# Create route
az afd route create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --endpoint-name bwwt-endpoint \
  --route-name default-route \
  --origin-group bwwt-origin-group \
  --supported-protocols Https \
  --https-redirect Enabled \
  --patterns-to-match "/*" \
  --custom-domains beforewewerethree-com \
  --forwarding-protocol HttpsOnly \
  --link-to-default-domain Disabled
```

## 5. Configure Caching (Optional)

For static assets, configure caching rules:

```bash
# Create rule set for caching
az afd rule-set create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --rule-set-name StaticAssetCaching

# Add caching rule for static files
az afd rule create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --rule-set-name StaticAssetCaching \
  --rule-name CacheStaticAssets \
  --order 1 \
  --match-variable UrlFileExtension \
  --operator Contains \
  --match-values js css png jpg jpeg gif svg ico woff woff2 \
  --action-name CacheExpiration \
  --cache-behavior OverrideAlways \
  --cache-duration 7.00:00:00
```

## 6. Verification Steps

### Check DNS Propagation

```bash
# Verify CNAME record
nslookup www.beforewewerethree.com

# Expected: Points to bwwt-endpoint.azurefd.net

# Verify TXT record
nslookup -type=TXT _dnsauth.beforewewerethree.com
```

### Check Front Door Health

```bash
# Check endpoint health
az afd endpoint show \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --endpoint-name bwwt-endpoint \
  --query "enabledState"

# Check origin health
az afd origin-group show \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --origin-group-name bwwt-origin-group \
  --query "healthProbeSettings"
```

### Test HTTPS and Redirect

```bash
# Test HTTPS
curl -I https://beforewewerethree.com

# Expected: HTTP/2 200, valid certificate

# Test HTTP redirect
curl -I http://beforewewerethree.com

# Expected: HTTP/1.1 301 or 308, Location: https://beforewewerethree.com

# Test health endpoint through Front Door
curl https://beforewewerethree.com/api/health

# Expected: { "success": true, "data": { "status": "healthy", ... } }
```

### Verify Certificate

```bash
# Check certificate details
echo | openssl s_client -connect beforewewerethree.com:443 -servername beforewewerethree.com 2>/dev/null | openssl x509 -noout -dates -subject
```

## Troubleshooting

### Domain Validation Fails

1. Verify TXT record is correctly set in Porkbun
2. Check for typos in the validation token
3. Wait up to 48 hours for DNS propagation
4. Try deleting and re-adding the domain in Front Door

### Certificate Provisioning Stuck

1. Ensure domain validation completed successfully
2. Check Azure Front Door has Standard tier (not Classic)
3. Managed certificates can take up to 24 hours initially
4. Contact Azure support if stuck beyond 24 hours

### Origin Health Probe Failures

1. Verify App Service is running: `az webapp show --name bwwt-app --resource-group bwwt-rg --query "state"`
2. Check health endpoint responds: `curl https://bwwt-app.azurewebsites.net/api/health`
3. Verify origin host header matches App Service hostname

### 502 Bad Gateway

1. Check App Service is running
2. Verify origin configuration uses correct hostname
3. Check origin group health status in Azure Portal

## Important Notes

- **Tier Selection:** Use Standard or Premium tier, not Classic. Classic tier has deprecated managed certificate support and will retire March 2027.
- **Certificate Renewal:** Managed certificates auto-renew before expiration.
- **Propagation Time:** DNS changes and certificate provisioning can take 10-30 minutes. Be patient.
- **Cost:** Standard tier pricing applies. Review Azure Front Door pricing before proceeding.

## Next Steps

After Front Door is configured:
1. Update GitHub Actions workflow to include cache purge on deployment
2. Test end-to-end deployment with cache invalidation
3. Monitor Front Door metrics in Azure Portal
