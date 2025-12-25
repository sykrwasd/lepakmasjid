# Quick Fix: Cloudflare Build Errors

## Problem 1: "root directory not found"

**Error:** `Failed: root directory not found`

**Cause:** The root directory is set to `dist`, but it should be `/` (or empty). `dist` is the build OUTPUT directory, not where your source code is.

### Solution:

1. Go to **Workers & Pages** → **lepakmasjid** → **Settings** → **Builds & deployments**
2. Find **"Root directory"** field
3. Change it from `dist` to `/` (or leave it empty/blank)
4. Keep **"Build output directory"** as `dist`
5. Save changes
6. Retry the deployment

**Important distinction:**
- **Root directory**: Where your source code is (should be `/` or empty)
- **Build output directory**: Where built files go (should be `dist`)

---

## Problem 2: Bun lockfile issues

**Error:** `lockfile had changes, but lockfile is frozen` or Cloudflare trying to use Bun

## Immediate Solution

### Step 1: Remove bun.lockb from Git

```powershell
# Remove from git tracking (file stays locally but won't be committed)
git rm --cached bun.lockb

# Commit the change
git commit -m "Remove bun.lockb to fix Cloudflare build"

# Push to trigger new deployment
git push
```

### Step 2: Update Cloudflare Build Settings

1. Go to your Cloudflare Pages project: **Workers & Pages** → **lepakmasjid**
2. Navigate to **Settings** → **Builds & deployments**
3. Update **Build command** to:
   ```
   pnpm install && pnpm build
   ```
   Or if you prefer npm:
   ```
   npm install && npm run build
   ```

### Step 3: Clear Build Cache

1. In the same **Builds & deployments** section
2. Click **"Clear build cache"** button
3. This ensures Cloudflare doesn't use cached Bun installation

### Step 4: Trigger New Deployment

1. Go to **Deployments** tab
2. Click **"Retry deployment"** on the failed deployment
   OR
3. Make a small change and push to trigger automatic deployment:
   ```powershell
   # Make a small change (e.g., update README)
   echo "" >> README.md
   git add README.md
   git commit -m "Trigger rebuild"
   git push
   ```

## Why This Works

- Cloudflare auto-detects package managers based on lockfiles
- Having `bun.lockb` makes Cloudflare try to use Bun
- Removing it forces Cloudflare to use `pnpm` (because `pnpm-lock.yaml` exists)
- The explicit build command ensures the correct package manager is used

## Verification

After deployment, check:
1. Build logs show `pnpm install` (not `bun install`)
2. Build completes successfully
3. Site is accessible

## Prevention

The `bun.lockb` file has been added to `.gitignore` to prevent this issue in the future.

---

## Problem 3: "ERR_PNPM_CANNOT_DEPLOY - A deploy is only possible from inside a workspace"

**Error:** `ERR_PNPM_CANNOT_DEPLOY  A deploy is only possible from inside a workspace`

**Cause:** The deploy command is set to `pnpm deploy`, but this project is not a pnpm workspace. Cloudflare Pages doesn't need a deploy command - it automatically deploys the build output.

### Solution:

1. Go to **Workers & Pages** → **lepakmasjid** → **Settings** → **Builds & deployments**
2. Find **"Deploy command"** field
3. **Clear it** (leave it empty/blank) or remove the value
4. Save changes
5. Retry the deployment

**Why:** Cloudflare Pages automatically deploys whatever is in your build output directory (`dist`). The deploy command is only needed for custom deployment scripts, which you don't need.

