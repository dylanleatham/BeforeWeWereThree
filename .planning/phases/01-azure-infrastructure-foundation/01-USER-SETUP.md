# Phase 01: User Setup Required

**Generated:** 2026-02-01
**Phase:** 01-azure-infrastructure-foundation
**Status:** Incomplete

## Overview

This phase created the deployment infrastructure code. To enable actual deployments to Azure, you need to configure the following external services and secrets.

## Environment Variables

These need to be configured as **GitHub repository secrets** for the deployment workflow to function.

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `AZURE_SUBSCRIPTION_ID` | Azure Portal -> Subscriptions -> Subscription ID | GitHub Secrets |
| [ ] | `AZURE_TENANT_ID` | Azure Portal -> Microsoft Entra ID -> Tenant ID | GitHub Secrets |
| [ ] | `AZURE_CLIENT_ID` | Azure Portal -> App Registrations -> bwwt-github-oidc -> Application (client) ID | GitHub Secrets |

## Dashboard Configuration

### 1. Create App Registration for GitHub OIDC

**Location:** Azure Portal -> Microsoft Entra ID -> App registrations -> New registration

**Steps:**
1. Go to Azure Portal -> Microsoft Entra ID
2. Click "App registrations" in the left menu
3. Click "New registration"
4. Name: `bwwt-github-oidc`
5. Supported account types: "Accounts in this organizational directory only"
6. Click "Register"
7. Copy the **Application (client) ID** - this is `AZURE_CLIENT_ID`

### 2. Configure Federated Credentials for GitHub Actions

**Location:** App Registration -> Certificates & secrets -> Federated credentials

**Steps:**
1. In your new App Registration, go to "Certificates & secrets"
2. Click "Federated credentials" tab
3. Click "Add credential"
4. Federated credential scenario: "GitHub Actions deploying Azure resources"
5. Organization: `{your-github-username-or-org}`
6. Repository: `BeforeWeWereThree`
7. Entity type: "Branch"
8. Branch: `main`
9. Name: `github-actions-main`
10. Click "Add"

### 3. Assign Contributor Role to App Registration

**Location:** Azure Portal -> Subscriptions -> IAM -> Add role assignment

**Steps:**
1. Go to Azure Portal -> Subscriptions
2. Select your subscription
3. Click "Access control (IAM)" in the left menu
4. Click "Add" -> "Add role assignment"
5. Role: "Contributor"
6. Members: Select the App Registration (`bwwt-github-oidc`)
7. Click "Review + assign"

### 4. Create Azure App Service

**Location:** Azure Portal -> App Services -> Create

**Steps:**
1. Go to Azure Portal -> App Services
2. Click "Create"
3. Name: `bwwt-app` (or set a custom name in GitHub vars)
4. Runtime stack: Node 22 LTS
5. Operating System: Linux
6. Region: Choose based on user location
7. Pricing plan: Basic B1 for dev, Standard S1 for production
8. Click "Review + create" -> "Create"

### 5. Configure GitHub Secrets

**Location:** GitHub Repository -> Settings -> Secrets and variables -> Actions

**Steps:**
1. Go to your repository on GitHub
2. Settings -> Secrets and variables -> Actions
3. Click "New repository secret" for each:
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
   - `AZURE_TENANT_ID`: Your Azure tenant ID
   - `AZURE_CLIENT_ID`: The Application ID from step 1

4. (Optional) Add repository variable:
   - `AZURE_WEBAPP_NAME`: Your custom App Service name (defaults to `bwwt-app`)

## Verification

After completing setup, verify by pushing to main:

```bash
git push origin main
```

Then check:
1. GitHub Actions -> The "Deploy to Azure" workflow should run
2. Azure Portal -> App Services -> Your app -> Should show deployment
3. Visit: `https://{app-name}.azurewebsites.net/api/health`
   - Should return: `{"success":true,"data":{"status":"healthy",...}}`

## Local Development

For local development, no Azure configuration is required:

```bash
# Start the server locally
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

---
**Once all items complete:** Mark status as "Complete" and re-run `git push origin main` to trigger deployment.
