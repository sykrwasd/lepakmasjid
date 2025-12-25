# Cloudflare Pages Deployment Guide

This guide will walk you through deploying LepakMasjid.app to Cloudflare Pages.

## Quick Start

If you're in a hurry, here's the TL;DR:

1. **Remove `bun.lockb` from Git** (if present, to avoid package manager conflicts):
   ```powershell
   git rm --cached bun.lockb
   git commit -m "Remove bun.lockb"
   git push
   ```

2. **Push code to Git** (GitHub/GitLab/Bitbucket)

3. **Connect to Cloudflare Pages** via dashboard

4. **Set build settings:**
   - Build command: `pnpm build` (or `npm run build`)
   - **Root directory**: `/` (or empty) ⚠️ **NOT `dist`!**
   - **Build output directory**: `dist`

5. **Add environment variables:**
   - `VITE_POCKETBASE_URL=https://pb.muazhazali.me`
   - `VITE_APP_URL=https://your-site.pages.dev`

6. **Deploy!** (automatic on git push)

**Note:** The `public/_redirects` file is already configured for client-side routing.

For detailed instructions, continue reading below.

## Prerequisites

- A Cloudflare account (free tier works)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Node.js 18+ installed locally (for testing builds)
- Your PocketBase instance URL (default: `https://pb.muazhazali.me`)

## Overview

Cloudflare Pages is a JAMstack platform that:
- ✅ Provides free hosting with global CDN
- ✅ Automatic deployments on git push
- ✅ Custom domain support
- ✅ Environment variable management
- ✅ Preview deployments for pull requests
- ✅ Built-in SSL certificates

## Step 1: Prepare Your Repository

Ensure your code is pushed to a Git repository:

```powershell
# If not already initialized
git init
git add .
git commit -m "Initial commit"

# Push to your remote repository (GitHub/GitLab/Bitbucket)
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

## Step 2: Create a Cloudflare Pages Project

### Option A: Via Cloudflare Dashboard

1. **Log in to Cloudflare**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Sign in or create a free account

2. **Navigate to Pages**
   - Click on **"Workers & Pages"** in the sidebar
   - Click **"Create application"**
   - Select **"Pages"** tab
   - Click **"Connect to Git"**

3. **Connect Your Repository**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Cloudflare to access your repositories
   - Select the repository: `lepakmasjid_v2`
   - Click **"Begin setup"**

4. **Configure Build Settings**
   - **Project name**: `lepakmasjid` (or your preferred name)
   - **Production branch**: `main` (or `master`)
   - **Framework preset**: `Vite` (or `None` if Vite is not listed)
   - **Build command**: `pnpm install && pnpm build` (or `npm install && npm run build`)
   - **Build output directory**: `dist` ⚠️ **This is where built files go**
   - **Root directory**: `/` ⚠️ **This must be `/` or empty (NOT `dist`!)**
   - **Deploy command**: ⚠️ **Leave this EMPTY/BLANK** (Cloudflare auto-deploys build output)
   
   **⚠️ CRITICAL:** 
   - **Root directory** = Where your source code is located (use `/` or leave empty)
   - **Build output directory** = Where Vite outputs built files (use `dist`)
   - **Deploy command** = Leave empty! Cloudflare automatically deploys from `dist`
   - **DO NOT** set root directory to `dist` - this will cause "root directory not found" error
   - **DO NOT** set deploy command to `pnpm deploy` - this will fail (not a workspace)
   
   **Important:** If you have `bun.lockb` in your repository, Cloudflare may auto-detect Bun. To force pnpm/npm, see the troubleshooting section below.

5. **Click "Save and Deploy"**

### Option B: Via Wrangler CLI (Advanced)

If you prefer using the command line:

```powershell
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a new Pages project
wrangler pages project create lepakmasjid

# Deploy manually (optional, usually auto-deploys from Git)
wrangler pages deploy dist --project-name=lepakmasjid
```

## Step 3: Configure Environment Variables

Environment variables are crucial for your app to connect to PocketBase and handle OAuth redirects.

### In Cloudflare Dashboard:

1. **Navigate to your Pages project**
   - Go to **Workers & Pages** → Your project name

2. **Go to Settings → Environment Variables**

3. **Add Production Environment Variables:**

   Click **"Add variable"** for each:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `VITE_POCKETBASE_URL` | `https://pb.muazhazali.me` | Your PocketBase instance URL |
   | `VITE_APP_URL` | `https://lepakmasjid.pages.dev` | Your Cloudflare Pages URL (update after deployment) |

   **Note:** Replace `lepakmasjid.pages.dev` with your actual Cloudflare Pages URL after the first deployment.

4. **Add Preview Environment Variables (Optional):**

   For preview deployments (pull requests), you might want different values:
   - `VITE_POCKETBASE_URL`: Same as production
   - `VITE_APP_URL`: Will be different for each preview

### Important Notes:

- **VITE_ prefix**: All environment variables used in Vite must be prefixed with `VITE_` to be exposed to the client-side code
- **Rebuild Required**: After adding/changing environment variables, you need to trigger a new deployment
- **OAuth Redirects**: Update `VITE_APP_URL` to match your final domain after setting up a custom domain

## Step 4: Configure Build Settings (if needed)

If your build fails or you need to customize:

1. **Go to Settings → Builds & deployments**

2. **Update Build Configuration:**

   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (default)
   - **Node.js version**: `18` or `20` (Cloudflare supports 18.x and 20.x)

3. **Package Manager Detection:**

   Cloudflare Pages auto-detects the package manager based on lockfiles:
   - `package-lock.json` → uses `npm`
   - `pnpm-lock.yaml` → uses `pnpm`
   - `yarn.lock` → uses `yarn`
   - `bun.lockb` → uses `bun` (⚠️ can cause issues if outdated)

   **If you have multiple lockfiles:**
   - Remove unused lockfiles (e.g., `bun.lockb` if using pnpm)
   - Ensure only one lockfile exists for your chosen package manager
   - The `bun.lockb` file has been added to `.gitignore` to prevent this issue

   **To force a specific package manager**, use a custom build command:
   ```
   pnpm install && pnpm run build
   ```
   or
   ```
   npm install && npm run build
   ```

## Step 5: Set Up Custom Domain (Optional)

### Add Custom Domain:

1. **Go to Settings → Custom domains**

2. **Click "Set up a custom domain"**

3. **Enter your domain**: e.g., `lepakmasjid.app` or `www.lepakmasjid.app`

4. **Configure DNS:**

   Cloudflare will provide DNS records to add:
   - **CNAME record**: Point your domain to `lepakmasjid.pages.dev`
   - Or use Cloudflare's nameservers for automatic configuration

5. **SSL/TLS:**

   - Cloudflare automatically provisions SSL certificates
   - Wait a few minutes for certificate activation
   - Ensure SSL/TLS encryption mode is set to **"Full"** or **"Full (strict)"**

### Update Environment Variables:

After setting up your custom domain, update `VITE_APP_URL`:

1. Go to **Settings → Environment Variables**
2. Update `VITE_APP_URL` to: `https://yourdomain.com` (or `https://www.yourdomain.com`)

3. **Trigger a new deployment** to apply the changes:
   - Go to **Deployments**
   - Click the three dots (⋯) on the latest deployment
   - Select **"Retry deployment"**

## Step 6: Configure PocketBase CORS

Your PocketBase instance needs to allow requests from your Cloudflare Pages domain.

### Update PocketBase CORS Settings:

1. **Log in to your PocketBase Admin UI**
   - Go to your PocketBase instance admin panel
   - Navigate to **Settings → API**

2. **Add Allowed Origins:**

   Add your Cloudflare Pages domains:
   - `https://lepakmasjid.pages.dev`
   - `https://yourdomain.com` (if using custom domain)
   - `https://www.yourdomain.com` (if using www subdomain)

3. **Save Settings**

### Update Google OAuth Redirect URIs:

If you're using Google OAuth:

1. **Go to Google Cloud Console**
   - Navigate to your OAuth 2.0 Client
   - Add authorized redirect URIs:
     - `https://lepakmasjid.pages.dev/auth/callback`
     - `https://yourdomain.com/auth/callback` (if using custom domain)

2. **Update PocketBase OAuth Settings:**
   - In PocketBase Admin UI → Settings → Auth providers
   - Update Google OAuth redirect URI to match your domain

## Step 7: Verify Deployment

### Check Deployment Status:

1. **Go to Deployments tab** in your Cloudflare Pages project
2. **Wait for build to complete** (usually 2-5 minutes)
3. **Click on the deployment** to see build logs
4. **Click "Visit site"** to view your deployed app

### Test Your Application:

1. **Homepage loads correctly**
2. **Map view works** (Leaflet.js loads)
3. **Authentication works** (login/register)
4. **API calls succeed** (check browser console for errors)
5. **OAuth redirects work** (if configured)

## Step 8: Enable Automatic Deployments

Cloudflare Pages automatically deploys on every push to your main branch.

### Branch Deployments:

- **Production**: Deploys from `main` (or your configured branch)
- **Preview**: Creates preview deployments for pull requests

### Deployment Triggers:

You can configure when deployments happen:

1. **Go to Settings → Builds & deployments**
2. **Configure:**
   - **Production deployments**: On push to main branch
   - **Preview deployments**: On pull requests (recommended)

## Troubleshooting

### Build Fails

**Error: "root directory not found"**

This happens when the root directory is incorrectly set to `dist` instead of `/`.

**Fix:**
1. Go to **Settings → Builds & deployments**
2. Set **Root directory** to `/` (or leave it empty/blank)
3. Keep **Build output directory** as `dist`
4. Save and retry deployment

**Remember:**
- Root directory = Where source code is (`/` or empty)
- Build output directory = Where built files go (`dist`)

**Error: "Command failed"**

- Check build logs in Cloudflare dashboard
- Ensure `package.json` has correct build script
- Verify Node.js version compatibility (use 18 or 20)

**Error: "Module not found"**

- Ensure all dependencies are in `package.json`
- Check that `node_modules` is not committed (should be in `.gitignore`)
- Verify build command uses correct package manager

**Error: "Environment variable not found"**

- Ensure variables are prefixed with `VITE_`
- Check that variables are set in the correct environment (Production/Preview)
- Trigger a new deployment after adding variables

**Error: "ERR_PNPM_CANNOT_DEPLOY - A deploy is only possible from inside a workspace"**

This happens when the deploy command is set to `pnpm deploy`, but your project is not a pnpm workspace.

**Fix:**
1. Go to **Settings → Builds & deployments**
2. Find **"Deploy command"** field
3. **Clear it completely** (leave it empty/blank)
4. Save and retry deployment

**Why:** Cloudflare Pages automatically deploys whatever is in your build output directory (`dist`). The deploy command is only needed for custom deployment scripts, which you don't need for a standard Vite build.

**Error: "lockfile had changes, but lockfile is frozen" or Bun detection issues**

If Cloudflare is trying to use Bun but you want to use npm/pnpm:

1. **Remove `bun.lockb` from your repository:**
   ```powershell
   # Add to .gitignore (already done)
   # Remove from git tracking
   git rm --cached bun.lockb
   git commit -m "Remove bun.lockb, use pnpm instead"
   git push
   ```

2. **Force Cloudflare to use pnpm:**
   - Go to **Settings → Builds & deployments**
   - Set **Build command** to: `pnpm install && pnpm build`
   - Or use npm: `npm install && npm run build`

3. **Alternative: Create `package.json` install script**
   - Cloudflare will auto-detect the package manager based on lockfiles
   - Ensure only `pnpm-lock.yaml` or `package-lock.json` exists (not `bun.lockb`)
   - Commit and push the changes

4. **Clear build cache:**
   - Go to **Settings → Builds & deployments**
   - Click **"Clear build cache"**
   - Trigger a new deployment

### Runtime Errors

**CORS Errors**

- Verify PocketBase CORS settings include your Cloudflare Pages domain
- Check browser console for specific CORS error messages
- Ensure PocketBase instance is accessible from the internet

**API Connection Errors**

- Verify `VITE_POCKETBASE_URL` is correct
- Check that PocketBase instance is running and accessible
- Test PocketBase health endpoint: `https://pb.muazhazali.me/api/health`

**OAuth Redirect Errors**

- Verify `VITE_APP_URL` matches your actual domain
- Check Google OAuth redirect URIs in Google Cloud Console
- Ensure PocketBase OAuth settings match your domain

### Performance Issues

**Slow Initial Load**

- Check build output size (should be optimized by Vite)
- Verify assets are being served from CDN (Cloudflare handles this)
- Check browser Network tab for slow resources

**Map Not Loading**

- Verify Leaflet.js CSS is included
- Check OpenStreetMap tile server accessibility
- Ensure no Content Security Policy blocking map tiles

## Advanced Configuration

### Custom Build Command

If you need a custom build process:

1. **Go to Settings → Builds & deployments**
2. **Update Build command:**

   ```bash
   npm install && npm run build
   ```

   Or with environment-specific builds:

   ```bash
   npm install && npm run build:production
   ```

### Headers and Redirects

**Important:** A `_redirects` file has been created in the `public/` directory to handle client-side routing. This is essential for React Router to work correctly.

The file contains:
```
/* /index.html 200
```

This ensures all routes are served by `index.html`, allowing React Router to handle client-side navigation.

**Optional: Custom Headers**

You can also create a `_headers` file in `public/` directory for additional security headers:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### Preview Deployments

Preview deployments are automatically created for pull requests:

- Each PR gets a unique preview URL
- Environment variables from "Preview" environment are used
- Great for testing before merging to production

## Continuous Deployment Workflow

Your typical workflow:

1. **Make changes** locally
2. **Commit and push** to a branch
3. **Create pull request** (optional, for preview)
4. **Merge to main** → Automatic production deployment
5. **Verify deployment** in Cloudflare dashboard

## Monitoring and Analytics

### Cloudflare Analytics:

- **Go to Analytics** tab in your Pages project
- View deployment history
- Monitor build times
- Check deployment success rates

### Application Monitoring:

Consider adding:
- Error tracking (e.g., Sentry)
- Analytics (e.g., Google Analytics, Plausible)
- Performance monitoring

## Cost

**Cloudflare Pages Free Tier Includes:**
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ Unlimited sites
- ✅ Custom domains
- ✅ SSL certificates

**Paid Plans:**
- Only needed if you exceed free tier limits
- Most projects stay within free tier

## Next Steps

After successful deployment:

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring/analytics
3. ✅ Configure custom domain (if desired)
4. ✅ Update documentation with production URL
5. ✅ Set up backup/deployment notifications

## Support

- **Cloudflare Pages Docs**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com)
- **Project Issues**: Open an issue in your repository

## Quick Reference

### Build Settings Summary:

```
Framework: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: 18 or 20
```

### Required Environment Variables:

```
VITE_POCKETBASE_URL=https://pb.muazhazali.me
VITE_APP_URL=https://your-domain.pages.dev
```

### Important Files:

- `package.json` - Dependencies and build scripts
- `vite.config.ts` - Vite configuration
- `public/_redirects` - Cloudflare Pages redirects for client-side routing (already created)
- `dist/` - Build output (auto-generated, don't commit)
- `.gitignore` - Should include `dist/` and `node_modules/`

---

**Congratulations!** Your LepakMasjid.app should now be live on Cloudflare Pages! 🎉

