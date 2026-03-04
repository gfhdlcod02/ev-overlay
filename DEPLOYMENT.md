# Deployment Guide: Smart EV Overlay

## 🚀 Quick Deploy (One Command)

```bash
./deploy.sh
```

This script will:

1. ✅ Check prerequisites
2. ✅ Install dependencies
3. ✅ Build all packages
4. ✅ Run tests
5. ✅ Create KV namespace (if needed)
6. ✅ Deploy Cloudflare Worker
7. ✅ Build and deploy Web App

---

## 📋 Step-by-Step (Manual)

### Step 1: Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Step 2: Create KV Namespace

```bash
cd workers/api
wrangler kv:namespace create "ROUTE_CACHE"
```

Copy the namespace ID from output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "ROUTE_CACHE"
id = "your-namespace-id-here"
```

### Step 3: Deploy Worker

```bash
cd workers/api
wrangler deploy
```

Copy your Worker URL (e.g., `https://ev-api.your-name.workers.dev`)

### Step 4: Deploy Web App

```bash
cd apps/web

# Set API URL
echo "VITE_API_URL=https://ev-api.your-name.workers.dev/api" > .env.production

# Build and deploy
pnpm build
wrangler pages deploy dist --project-name=ev-overlay
```

---

## 🏷️ Version Management

The deployment process automatically handles versioning across all packages.

### How It Works

| Step | Command               | Description                                                 |
| ---- | --------------------- | ----------------------------------------------------------- |
| 1    | `pnpm version:sync`   | Syncs root `package.json` version to all workspace packages |
| 2    | `pnpm build`          | Builds all packages with synchronized versions              |
| 3    | `pnpm version:inject` | Injects version into built files (Web + Worker)             |

### Version Display

- **Web UI**: Version shown at bottom left corner (e.g., `v1.2.0`)
- **API Endpoint**: `GET /api/version` returns `{version, commit}`
- **Static File**: `version.json` in web root for programmatic access

---

## 🔧 GitHub Actions (Auto Deploy on Tags)

The workflow is configured to:

- **Run tests** on every push to `main` and pull requests
- **Deploy** only when a version tag is created (e.g., `v1.0.0`, `v2.1.3`)

### How to Deploy

1. Create a release branch from `main`:

```bash
git checkout main
git pull
git checkout -b release/v1.3.0
```

2. Bump version and sync to all packages:

```bash
npm version 1.3.0 --no-git-tag-version
pnpm version:sync
```

3. Commit the version changes:

```bash
git add -A
git commit -m "chore(release): v1.3.0"
```

4. Push branch and create Pull Request:

```bash
git push -u origin release/v1.3.0
gh pr create --title "chore(release): v1.3.0" --body "Version bump"
```

5. After PR is merged, create and push the tag:

```bash
git checkout main
git pull
git tag v1.3.0
git push --tags
```

GitHub Actions will automatically:

- Run tests and linting
- Sync version to all packages (`pnpm version:sync`)
- Inject version into Worker source (`scripts/inject-version-worker.js`)
- Deploy Worker to Cloudflare
- Build web app
- Inject version into web artifacts (`pnpm version:inject`)
- Deploy Web App to Pages

### GitHub Secrets Setup

Go to Settings → Secrets and variables:

| Secret                  | Value                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Get from [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Get from Workers dashboard                                                                        |

### GitHub Variables

| Variable  | Value                                 |
| --------- | ------------------------------------- |
| `API_URL` | `https://your-worker.workers.dev/api` |

### Tag Format

Use semantic versioning:

- `v1.0.0` - Major release
- `v1.1.0` - Minor release
- `v1.1.1` - Patch release

---

## 🌐 Custom Domain

### Web App

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Select your project → Custom domains
3. Click "Set up a custom domain"
4. Enter your domain (e.g., `yourevapp.com`)

### API Worker

Add to `workers/api/wrangler.toml`:

```toml
routes = [
  { pattern = "api.yourevapp.com", custom_domain = true }
]
```

Then redeploy:

```bash
cd workers/api
wrangler deploy
```

Update web app:

```bash
echo "VITE_API_URL=https://api.yourevapp.com/api" > apps/web/.env.production
cd apps/web && pnpm build && wrangler pages deploy dist
```

---

## ✅ Verification

### Check Version

After deployment, verify the version:

```bash
# Check API version
curl "https://your-worker.workers.dev/api/version"
# → {"version":"1.2.0","commit":"abc1234"}

# Check Web App version
curl "https://your-app.pages.dev/version.json"
# → {"version":"1.2.0","buildTime":"2026-03-03T...","commit":"abc1234"}
```

### Test Worker

```bash
curl "https://your-worker.workers.dev/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437"
```

### Test Web App

1. Open your Pages URL
2. Enter a test trip:
   - Origin: `San Francisco, CA`
   - Destination: `Los Angeles, CA`
   - Current Charge: `80%`
   - Range at 100%: `400`
3. Click "Plan Trip"
4. Verify map shows route with stops

---

## 🔍 Troubleshooting

### "KV namespace not found"

```bash
cd workers/api
wrangler kv:namespace create "ROUTE_CACHE"
# Copy ID to wrangler.toml
```

### "Build failed"

```bash
pnpm install
pnpm build
```

### "CORS error"

Check that `VITE_API_URL` matches your deployed Worker URL exactly.

### "Blank page"

Check browser console for errors. Usually:

- Wrong API_URL
- Build failed

---

## 📊 Monitoring

```bash
# View Worker logs
cd workers/api
wrangler tail

# Check KV storage
wrangler kv:key list --namespace-id=YOUR_ID
```

---

## 🎉 Done!

Your app is live! Share your URL:

- Web: `https://ev-overlay.pages.dev`
- API: `https://ev-api.YOUR_NAME.workers.dev`
