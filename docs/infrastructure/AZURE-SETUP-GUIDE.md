# Azure Setup Guide - Complete Infrastructure

This guide walks through creating all Azure resources for Before We Were Three in the correct order. Complete each section before moving to the next.

**Estimated time:** 45-60 minutes (includes waiting for DNS/certificate provisioning)

---

## Prerequisites

- Azure subscription with Owner or Contributor access
- Azure CLI installed and logged in (`az login`)
- GitHub repository created
- Domain registered (beforewewerethree.com) with DNS access (Porkbun)

### Verify Azure CLI

```bash
az --version  # Should be 2.50+
az account show  # Verify logged in
```

---

## Quick Reference - Resource Names

| Resource | Name | Notes |
|----------|------|-------|
| Resource Group | `bwwt-rg` | Container for all resources |
| App Service Plan | `bwwt-plan` | Hosting plan |
| App Service | `bwwt-app` | Web application |
| Key Vault | `bwwt-kv` | Must be globally unique |
| PostgreSQL Server | `bwwt-db` | Must be globally unique |
| Front Door | `bwwt-fd` | CDN and custom domain |
| App Registration | `bwwt-github-oidc` | GitHub Actions auth |

---

## Step 1: Create Resource Group

The resource group is a container for all Azure resources.

### Azure Portal

1. Go to **Azure Portal** → **Resource groups** → **Create**
2. **Subscription:** Select your subscription
3. **Resource group:** `bwwt-rg`
4. **Region:** `East US` (or your preferred region)
5. Click **Review + create** → **Create**

### Azure CLI

```bash
az group create \
  --name bwwt-rg \
  --location eastus
```

### Verify

```bash
az group show --name bwwt-rg --query "properties.provisioningState"
# Expected: "Succeeded"
```

---

## Step 2: Create App Registration (GitHub OIDC)

This allows GitHub Actions to deploy to Azure without storing credentials.

### Azure Portal

1. Go to **Microsoft Entra ID** → **App registrations** → **New registration**
2. **Name:** `bwwt-github-oidc`
3. **Supported account types:** Accounts in this organizational directory only
4. Click **Register**
5. **Copy these values** (you'll need them for GitHub secrets):
   - **Application (client) ID** → `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_TENANT_ID`

### Configure Federated Credentials

1. In the App Registration, go to **Certificates & secrets**
2. Click **Federated credentials** → **Add credential**
3. **Scenario:** GitHub Actions deploying Azure resources
4. **Organization:** Your GitHub username or org
5. **Repository:** `BeforeWeWereThree`
6. **Entity type:** Branch
7. **Branch:** `main`
8. **Name:** `github-actions-main`
9. Click **Add**

### Assign Contributor Role

1. Go to **Subscriptions** → Select your subscription
2. Click **Access control (IAM)** → **Add** → **Add role assignment**
3. **Role:** Contributor
4. **Members:** Select members → Search for `bwwt-github-oidc`
5. Click **Review + assign**

### Azure CLI Alternative

```bash
# Create app registration
APP_ID=$(az ad app create --display-name bwwt-github-oidc --query appId -o tsv)
echo "AZURE_CLIENT_ID: $APP_ID"

# Create service principal
az ad sp create --id $APP_ID

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "AZURE_TENANT_ID: $TENANT_ID"

# Get subscription ID
SUB_ID=$(az account show --query id -o tsv)
echo "AZURE_SUBSCRIPTION_ID: $SUB_ID"

# Add federated credential (replace YOUR_GITHUB_USERNAME)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:YOUR_GITHUB_USERNAME/BeforeWeWereThree:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# Assign Contributor role
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUB_ID
```

---

## Step 3: Create App Service

### Azure Portal

1. Go to **Create a resource** → **Web App**
2. **Basics:**
   - **Resource Group:** `bwwt-rg`
   - **Name:** `bwwt-app`
   - **Publish:** Code
   - **Runtime stack:** Node 22 LTS
   - **Operating System:** Linux
   - **Region:** East US (same as resource group)
3. **Pricing plan:**
   - Create new: `bwwt-plan`
   - **Pricing tier:** Basic B1 (dev) or Standard S1 (production)
4. Click **Review + create** → **Create**

### Azure CLI

```bash
# Create App Service Plan
az appservice plan create \
  --name bwwt-plan \
  --resource-group bwwt-rg \
  --location eastus \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name bwwt-app \
  --resource-group bwwt-rg \
  --plan bwwt-plan \
  --runtime "NODE:22-lts"
```

### Enable Managed Identity

This is required for Key Vault access.

**Portal:** App Service → **Identity** → System assigned → **On** → **Save**

**CLI:**
```bash
az webapp identity assign \
  --name bwwt-app \
  --resource-group bwwt-rg
```

### Verify

```bash
# Check app is running
curl https://bwwt-app.azurewebsites.net
# Will show default Azure page until we deploy
```

---

## Step 4: Create Key Vault

Key Vault stores secrets (database password, JWT secret).

### Azure Portal

1. Go to **Create a resource** → **Key Vault**
2. **Basics:**
   - **Resource Group:** `bwwt-rg`
   - **Key vault name:** `bwwt-kv` (must be globally unique - add random suffix if taken)
   - **Region:** East US
   - **Pricing tier:** Standard
3. **Access configuration:**
   - **Permission model:** Azure role-based access control (RBAC)
4. Click **Review + create** → **Create**

### Azure CLI

```bash
az keyvault create \
  --name bwwt-kv \
  --resource-group bwwt-rg \
  --location eastus \
  --enable-rbac-authorization true
```

### Grant App Service Access

**Portal:**
1. Key Vault → **Access control (IAM)** → **Add role assignment**
2. **Role:** Key Vault Secrets User
3. **Members:** Managed identity → Select `bwwt-app`
4. **Review + assign**

**CLI:**
```bash
# Get App Service principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name bwwt-app \
  --resource-group bwwt-rg \
  --query principalId -o tsv)

# Get Key Vault ID
KV_ID=$(az keyvault show \
  --name bwwt-kv \
  --resource-group bwwt-rg \
  --query id -o tsv)

# Assign role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $PRINCIPAL_ID \
  --scope $KV_ID
```

---

## Step 5: Create PostgreSQL Database

### Azure Portal

1. Go to **Create a resource** → **Azure Database for PostgreSQL** → **Flexible server**
2. **Basics:**
   - **Resource Group:** `bwwt-rg`
   - **Server name:** `bwwt-db` (must be globally unique)
   - **Region:** East US
   - **PostgreSQL version:** 16
   - **Workload type:** Production (General Purpose)
     - **Important:** Do NOT use Burstable for production
   - **Compute:** D2s_v3 (2 vCores, 8 GB RAM)
   - **Storage:** 32 GB, auto-grow enabled
3. **Authentication:**
   - **Method:** PostgreSQL authentication only
   - **Admin username:** `bwwtadmin`
   - **Password:** Generate strong password (save it!)
4. **Networking:**
   - For simplicity: **Public access**
   - Check **Allow public access from any Azure service**
5. Click **Review + create** → **Create**

### Azure CLI

```bash
# Generate password (save this!)
DB_PASSWORD=$(openssl rand -base64 24)
echo "Database password: $DB_PASSWORD"

az postgres flexible-server create \
  --name bwwt-db \
  --resource-group bwwt-rg \
  --location eastus \
  --admin-user bwwtadmin \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group bwwt-rg \
  --server-name bwwt-db \
  --database-name bwwt_db

# Enable PgBouncer
az postgres flexible-server parameter set \
  --resource-group bwwt-rg \
  --server-name bwwt-db \
  --name pgbouncer.enabled \
  --value true
```

### Store Secrets in Key Vault

**Generate JWT secret:**
```bash
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT Secret: $JWT_SECRET"
```

**Connection string format:**
```
postgresql://bwwtadmin:YOUR_PASSWORD@bwwt-db.postgres.database.azure.com:6432/bwwt_db?sslmode=require
```

**Portal:**
1. Key Vault → **Secrets** → **Generate/Import**
2. Create secret `database-url` with connection string
3. Create secret `jwt-secret` with generated JWT secret

**CLI:**
```bash
# Store database URL (replace YOUR_PASSWORD)
az keyvault secret set \
  --vault-name bwwt-kv \
  --name "database-url" \
  --value "postgresql://bwwtadmin:YOUR_PASSWORD@bwwt-db.postgres.database.azure.com:6432/bwwt_db?sslmode=require"

# Store JWT secret
az keyvault secret set \
  --vault-name bwwt-kv \
  --name "jwt-secret" \
  --value "$JWT_SECRET"
```

### Configure App Service Environment Variables

**Portal:**
1. App Service → **Configuration** → **Application settings**
2. Add:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=database-url)` |
   | `JWT_SECRET` | `@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=jwt-secret)` |
3. Click **Save**

**CLI:**
```bash
az webapp config appsettings set \
  --name bwwt-app \
  --resource-group bwwt-rg \
  --settings \
    DATABASE_URL="@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=database-url)" \
    JWT_SECRET="@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=jwt-secret)"
```

---

## Step 6: Create Front Door (CDN + Custom Domain)

### Azure Portal

1. Go to **Create a resource** → **Front Door and CDN profiles**
2. Select **Azure Front Door** (NOT Classic)
3. **Basics:**
   - **Resource Group:** `bwwt-rg`
   - **Name:** `bwwt-fd`
   - **Tier:** Standard
4. **Endpoint:**
   - **Endpoint name:** `bwwt-endpoint`
   - **Origin type:** App Service
   - **Origin host name:** `bwwt-app.azurewebsites.net`
5. Click **Review + create** → **Create**

### Azure CLI

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

# Create origin group
az afd origin-group create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --origin-group-name bwwt-origin-group \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-path /api/health \
  --probe-interval-in-seconds 30

# Add origin
az afd origin create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --origin-group-name bwwt-origin-group \
  --origin-name bwwt-app-origin \
  --host-name bwwt-app.azurewebsites.net \
  --origin-host-header bwwt-app.azurewebsites.net \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled

# Create default route
az afd route create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --endpoint-name bwwt-endpoint \
  --route-name default-route \
  --origin-group bwwt-origin-group \
  --supported-protocols Https \
  --https-redirect Enabled \
  --patterns-to-match "/*" \
  --forwarding-protocol HttpsOnly
```

---

## Step 7: Configure Custom Domain

### Add Domain to Front Door

**Portal:**
1. Front Door profile → **Domains** → **Add**
2. **Domain type:** Non-Azure pre-validated domain
3. **Custom domain:** `beforewewerethree.com`
4. **Copy the TXT validation token** shown
5. Click **Add**

**CLI:**
```bash
az afd custom-domain create \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --custom-domain-name beforewewerethree-com \
  --host-name beforewewerethree.com \
  --certificate-type ManagedCertificate \
  --minimum-tls-version TLS12

# Get validation token
az afd custom-domain show \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --custom-domain-name beforewewerethree-com \
  --query "validationProperties.validationToken" -o tsv
```

### Configure DNS in Porkbun

1. Log in to **Porkbun** → **Domain Management** → `beforewewerethree.com` → **DNS**

2. **Add TXT record for validation:**
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | TXT | `_dnsauth` | [validation token from Azure] | 300 |

3. **Add CNAME for www:**
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | CNAME | `www` | `bwwt-endpoint-xxxxxxxx.z01.azurefd.net` | 300 |

   (Get the exact endpoint hostname from Front Door → Endpoints)

4. **Add ALIAS for apex domain:**
   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | ALIAS | `@` | `bwwt-endpoint-xxxxxxxx.z01.azurefd.net` | 300 |

5. **Save and wait** (5-30 minutes for DNS propagation)

### Validate Domain in Azure

**Portal:**
1. Front Door → **Domains**
2. Click **Validate** on your domain
3. Wait for status to change to **Approved**
4. Certificate provisioning starts automatically (10-30 min)

### Associate Domain with Route

**Portal:**
1. Front Door → **Front Door manager** → Edit the route
2. Add your custom domain to the route
3. Save

**CLI:**
```bash
az afd route update \
  --resource-group bwwt-rg \
  --profile-name bwwt-fd \
  --endpoint-name bwwt-endpoint \
  --route-name default-route \
  --custom-domains beforewewerethree-com
```

---

## Step 8: Configure GitHub Secrets

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

2. Add these **Repository secrets**:

   | Secret Name | Value |
   |-------------|-------|
   | `AZURE_CLIENT_ID` | Application (client) ID from Step 2 |
   | `AZURE_TENANT_ID` | Directory (tenant) ID from Step 2 |
   | `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |

3. Get subscription ID:
   ```bash
   az account show --query id -o tsv
   ```

---

## Step 9: Deploy and Verify

### Push to Trigger Deployment

```bash
git push origin main
```

### Monitor Deployment

1. GitHub → **Actions** → Watch the deployment workflow
2. Should see: Checkout → Azure Login → Build → Deploy → Cache Purge

### Verify Everything Works

```bash
# Test via Azure subdomain
curl https://bwwt-app.azurewebsites.net/api/health

# Test via Front Door endpoint
curl https://bwwt-endpoint-xxxxxxxx.z01.azurefd.net/api/health

# Test via custom domain (after DNS/cert ready)
curl https://beforewewerethree.com/api/health

# Expected response:
# {"success":true,"data":{"status":"healthy","timestamp":"...","version":"1.0.0"}}
```

### Run Database Migrations

In Azure Portal → App Service → **SSH** (under Development Tools):

```bash
cd /home/site/wwwroot
npx prisma migrate deploy
```

---

## Verification Checklist

- [ ] Resource group `bwwt-rg` exists
- [ ] App Registration `bwwt-github-oidc` created with federated credential
- [ ] App Service `bwwt-app` running Node 22
- [ ] App Service has managed identity enabled
- [ ] Key Vault `bwwt-kv` created with RBAC
- [ ] App Service has Key Vault Secrets User role
- [ ] PostgreSQL `bwwt-db` created with PgBouncer enabled
- [ ] Secrets `database-url` and `jwt-secret` stored in Key Vault
- [ ] App Service has Key Vault reference settings (green checkmarks)
- [ ] Front Door `bwwt-fd` created (Standard tier)
- [ ] DNS TXT record added for domain validation
- [ ] DNS CNAME/ALIAS records point to Front Door
- [ ] Custom domain validated and certificate provisioned
- [ ] GitHub secrets configured
- [ ] GitHub Actions deployment succeeds
- [ ] Health endpoint responds at custom domain
- [ ] Prisma migrations applied

---

## Troubleshooting

### GitHub Actions "AADSTS700016" Error
- Federated credential subject doesn't match
- Verify: `repo:USERNAME/BeforeWeWereThree:ref:refs/heads/main`

### Key Vault "Access Denied"
- Managed identity not enabled on App Service
- Role assignment not propagated (wait 5-10 min)
- Secret name case mismatch

### Database Connection Failed
- Firewall not allowing Azure services
- Connection string password not URL-encoded
- Wrong port (use 6432 for PgBouncer, 5432 for direct)

### Custom Domain Not Working
- DNS not propagated (check with `nslookup`)
- Certificate still provisioning (wait up to 24h)
- Route not associated with domain

### Front Door 502 Error
- App Service not running
- Origin hostname incorrect
- Health probe failing

---

## Cost Estimate (Monthly)

| Resource | Tier | ~Cost |
|----------|------|-------|
| App Service | B1 | $13 |
| PostgreSQL | D2s_v3 | $100 |
| Key Vault | Standard | $0.03/secret |
| Front Door | Standard | $35 + traffic |
| **Total** | | ~$150/month |

For development, use:
- App Service: F1 (Free)
- PostgreSQL: Burstable B1ms (~$15)
- Skip Front Door (use .azurewebsites.net)

---

*Last updated: 2026-02-01*
