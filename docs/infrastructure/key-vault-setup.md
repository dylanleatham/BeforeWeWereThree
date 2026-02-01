# Azure Key Vault Setup

This guide covers setting up Azure Key Vault for secure secrets management in the Before We Were Three application.

## Overview

Key Vault stores:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing secret

App Service accesses secrets via managed identity (no credentials in config).

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed (`az --version`)
- App Service already created (from 01-02)

## Step 1: Create Key Vault

### Azure Portal

1. Navigate to **Create a resource** > **Key Vault**
2. Configure:
   - **Resource group:** `bwwt-rg` (same as App Service)
   - **Key vault name:** `bwwt-kv` (must be globally unique)
   - **Region:** Same as App Service
   - **Pricing tier:** Standard
3. Under **Access configuration**:
   - **Permission model:** Azure role-based access control (RBAC)
   - Do NOT use vault access policy
4. Review and create

### Azure CLI

```bash
# Variables
RESOURCE_GROUP="bwwt-rg"
KEY_VAULT_NAME="bwwt-kv"
LOCATION="eastus"  # Match your App Service region

# Create Key Vault with RBAC authorization
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true
```

## Step 2: Enable Managed Identity on App Service

### Azure Portal

1. Navigate to your App Service
2. Go to **Settings** > **Identity**
3. Under **System assigned**, set **Status** to **On**
4. Click **Save**
5. Note the **Object ID** displayed

### Azure CLI

```bash
APP_SERVICE_NAME="bwwt-app"

# Enable system-assigned managed identity
az webapp identity assign \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

echo "Principal ID: $PRINCIPAL_ID"
```

## Step 3: Grant Key Vault Access to App Service

### Azure Portal

1. Navigate to your Key Vault
2. Go to **Access control (IAM)**
3. Click **Add** > **Add role assignment**
4. Select role: **Key Vault Secrets User**
5. Click **Next**
6. Select **Managed identity**
7. Click **Select members**
8. Choose your App Service's managed identity
9. Click **Review + assign**

### Azure CLI

```bash
# Get Key Vault resource ID
KEY_VAULT_ID=$(az keyvault show \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query id \
  --output tsv)

# Assign Key Vault Secrets User role to App Service identity
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $PRINCIPAL_ID \
  --scope $KEY_VAULT_ID
```

## Step 4: Store Secrets

### Azure Portal

1. Navigate to your Key Vault
2. Go to **Objects** > **Secrets**
3. Click **Generate/Import**
4. Create secrets:
   - **Name:** `database-url`
   - **Value:** Your PostgreSQL connection string (see database-setup.md)
5. Repeat for:
   - **Name:** `jwt-secret`
   - **Value:** A random 256-bit key (generate with `openssl rand -base64 32`)

### Azure CLI

```bash
# Store DATABASE_URL (replace with your actual connection string)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "database-url" \
  --value "postgresql://user:password@host:5432/bwwt_db?sslmode=require"

# Generate and store JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --value "$JWT_SECRET"
```

## Step 5: Configure App Service to Use Key Vault References

### Azure Portal

1. Navigate to your App Service
2. Go to **Settings** > **Environment variables**
3. Add application settings:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=database-url)` |
| `JWT_SECRET` | `@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=jwt-secret)` |

4. **Important:** Check **Deployment slot setting** for both if using deployment slots
5. Click **Apply**

### Azure CLI

```bash
# Configure App Service settings with Key Vault references
az webapp config appsettings set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DATABASE_URL="@Microsoft.KeyVault(VaultName=$KEY_VAULT_NAME;SecretName=database-url)" \
    JWT_SECRET="@Microsoft.KeyVault(VaultName=$KEY_VAULT_NAME;SecretName=jwt-secret)"

# Mark as slot settings if using deployment slots
az webapp config appsettings set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --slot-settings \
    DATABASE_URL="@Microsoft.KeyVault(VaultName=$KEY_VAULT_NAME;SecretName=database-url)" \
    JWT_SECRET="@Microsoft.KeyVault(VaultName=$KEY_VAULT_NAME;SecretName=jwt-secret)"
```

## Verification

### Check Key Vault Reference Status

1. Navigate to App Service > **Settings** > **Environment variables**
2. Look for green checkmark next to Key Vault references
3. Red X indicates permission or configuration issue

### Test from App Service Console

```bash
# In App Service SSH console
echo $DATABASE_URL
# Should show the actual connection string, not the reference syntax
```

### Check Logs

```bash
az webapp log tail --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP
```

Look for:
- "Successfully retrieved secret" messages
- No "Secret not found" or "Access denied" errors

## Troubleshooting

### "Key Vault reference not resolved"

1. Verify managed identity is enabled
2. Check Key Vault Secrets User role is assigned
3. Ensure secret name matches exactly (case-sensitive)
4. Restart App Service after configuration changes

### "Access denied" in logs

1. Verify the role assignment scope includes the specific secret
2. Wait 5-10 minutes for RBAC propagation
3. Check Key Vault firewall allows access from App Service

## Security Notes

- Never commit secrets to git
- Use separate Key Vaults for dev/staging/production
- Rotate secrets periodically (Key Vault supports versioning)
- Enable soft-delete and purge protection for production Key Vaults
