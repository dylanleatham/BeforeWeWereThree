# Azure PostgreSQL Database Setup

This guide covers setting up Azure Database for PostgreSQL Flexible Server for the Before We Were Three application.

## Overview

PostgreSQL Flexible Server provides:
- Managed PostgreSQL with automatic backups
- Built-in PgBouncer connection pooling
- High availability options
- Pay-per-use pricing

## Prerequisites

- Azure subscription with Contributor access
- Azure CLI installed (`az --version`)
- Key Vault already created (from key-vault-setup.md)

## Step 1: Create PostgreSQL Flexible Server

### Azure Portal

1. Navigate to **Create a resource** > **Azure Database for PostgreSQL**
2. Select **Flexible server**
3. Configure:

**Basics:**
- **Resource group:** `bwwt-rg`
- **Server name:** `bwwt-db` (must be globally unique)
- **Region:** Same as App Service
- **PostgreSQL version:** 16 (latest stable)
- **Workload type:** Production (General Purpose)
  - **Important:** Do NOT use Burstable tier for production - it has CPU credit limits that cause performance issues under load
- **Compute + storage:**
  - Start with General Purpose D2s_v3 (2 vCores, 8 GB RAM)
  - Storage: 32 GB with auto-grow enabled

**Authentication:**
- **Authentication method:** PostgreSQL authentication only
- **Admin username:** `bwwtadmin`
- **Password:** Generate a strong password (store securely)

**Networking:**
- Select based on your security requirements (see Step 2)

4. Review and create

### Azure CLI

```bash
# Variables
RESOURCE_GROUP="bwwt-rg"
SERVER_NAME="bwwt-db"
LOCATION="eastus"
ADMIN_USER="bwwtadmin"
ADMIN_PASSWORD="<generate-strong-password>"  # Use: openssl rand -base64 24

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name $SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $ADMIN_USER \
  --admin-password "$ADMIN_PASSWORD" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 32 \
  --storage-auto-grow Enabled \
  --public-access None  # Configure networking separately
```

## Step 2: Configure Networking

Choose ONE of these options based on your security requirements:

### Option A: VNet Integration (Recommended for Production)

This provides private networking between App Service and PostgreSQL.

#### Azure Portal

1. When creating PostgreSQL, under **Networking**:
   - Select **Private access (VNet Integration)**
   - Create or select a Virtual Network
   - Create or select a subnet for database

2. Configure App Service VNet integration:
   - Navigate to App Service > **Networking** > **VNet Integration**
   - Add VNet integration with the same VNet

#### Azure CLI

```bash
VNET_NAME="bwwt-vnet"
DB_SUBNET="db-subnet"
APP_SUBNET="app-subnet"

# Create VNet
az network vnet create \
  --name $VNET_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create subnets
az network vnet subnet create \
  --name $DB_SUBNET \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --address-prefix 10.0.1.0/24 \
  --delegations Microsoft.DBforPostgreSQL/flexibleServers

az network vnet subnet create \
  --name $APP_SUBNET \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --address-prefix 10.0.2.0/24 \
  --delegations Microsoft.Web/serverFarms

# Note: VNet integration must be configured during server creation
# or through Azure Portal for existing servers
```

### Option B: Firewall Rules (Simpler for Development)

Allow specific IP addresses to connect.

#### Azure Portal

1. Navigate to PostgreSQL server > **Networking**
2. Under **Firewall rules**:
   - Check **Allow public access from any Azure service within Azure**
   - Add your local IP for development access

#### Azure CLI

```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --name AllowAzureServices \
  --resource-group $RESOURCE_GROUP \
  --server-name $SERVER_NAME \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your local IP (for development)
MY_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --name AllowMyIP \
  --resource-group $RESOURCE_GROUP \
  --server-name $SERVER_NAME \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

## Step 3: Create Application Database

### Azure Portal

1. Navigate to PostgreSQL server > **Databases**
2. Click **Add**
3. **Name:** `bwwt_db`
4. **Charset:** `UTF8`
5. Click **Save**

### Azure CLI

```bash
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $SERVER_NAME \
  --database-name bwwt_db
```

## Step 4: Enable PgBouncer (Connection Pooling)

PgBouncer reduces connection overhead and is recommended for web applications.

### Azure Portal

1. Navigate to PostgreSQL server > **Server parameters**
2. Search for `pgbouncer`
3. Set `pgbouncer.enabled` to `true`
4. Set `pgbouncer.default_pool_size` to `50` (adjust based on load)
5. Click **Save**

### Azure CLI

```bash
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $SERVER_NAME \
  --name pgbouncer.enabled \
  --value true

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $SERVER_NAME \
  --name pgbouncer.default_pool_size \
  --value 50
```

## Step 5: Generate and Store Connection String

### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

With PgBouncer enabled, use port `6432` instead of `5432`:

```
postgresql://bwwtadmin:YOUR_PASSWORD@bwwt-db.postgres.database.azure.com:6432/bwwt_db?sslmode=require
```

### Store in Key Vault

#### Azure Portal

1. Navigate to Key Vault > **Secrets**
2. Click **Generate/Import**
3. **Name:** `database-url`
4. **Value:** Your connection string
5. Click **Create**

#### Azure CLI

```bash
KEY_VAULT_NAME="bwwt-kv"
CONNECTION_STRING="postgresql://$ADMIN_USER:$ADMIN_PASSWORD@$SERVER_NAME.postgres.database.azure.com:6432/bwwt_db?sslmode=require"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "database-url" \
  --value "$CONNECTION_STRING"
```

## Step 6: Verify Connection

### From Local Machine (if firewall allows)

```bash
# Test connection with psql
psql "postgresql://bwwtadmin:YOUR_PASSWORD@bwwt-db.postgres.database.azure.com:6432/bwwt_db?sslmode=require"

# Test Prisma connection
DATABASE_URL="postgresql://..." npx prisma db push --accept-data-loss
```

### From App Service

After deploying with Key Vault references configured:

```bash
# In App Service SSH/Console
npx prisma migrate deploy
```

## Production Considerations

### Backup and Recovery

- Automatic backups are enabled by default (7-day retention)
- For production, increase retention to 35 days
- Enable geo-redundant backups for disaster recovery

```bash
az postgres flexible-server update \
  --name $SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --backup-retention 35
```

### High Availability

For production workloads, enable zone-redundant HA:

```bash
az postgres flexible-server update \
  --name $SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --high-availability ZoneRedundant
```

### Monitoring

1. Enable diagnostic settings:
   - Navigate to PostgreSQL > **Monitoring** > **Diagnostic settings**
   - Send logs to Log Analytics workspace

2. Set up alerts:
   - High CPU utilization (> 80%)
   - Low storage space (< 20%)
   - High connection count

### Scaling

Start small and scale up as needed:

| Stage | SKU | vCores | RAM | Use Case |
|-------|-----|--------|-----|----------|
| Development | Burstable B1ms | 1 | 2 GB | Local dev only |
| Staging | General Purpose D2s_v3 | 2 | 8 GB | Testing |
| Production | General Purpose D4s_v3 | 4 | 16 GB | Initial launch |
| Scale | General Purpose D8s_v3 | 8 | 32 GB | Growth |

## Deployment Slots Warning

If using App Service deployment slots:

1. Mark `DATABASE_URL` as **Deployment slot setting**
2. This prevents staging slots from accidentally using production database
3. Each slot should have its own database or use a staging database

Configure in App Service > **Environment variables** > check "Deployment slot setting" checkbox.

## Troubleshooting

### "Connection refused"

1. Check firewall rules include App Service IPs
2. Verify PostgreSQL server is running
3. If using VNet, verify integration is configured

### "Authentication failed"

1. Verify username format: `username` not `username@servername`
2. Check password is URL-encoded if it contains special characters
3. Verify connection string in Key Vault matches exactly

### "SSL required"

- Always use `sslmode=require` in connection string
- Azure PostgreSQL requires SSL connections by default

### "Too many connections"

1. Enable PgBouncer if not already enabled
2. Increase `pgbouncer.default_pool_size`
3. Consider scaling up the server SKU
