# Tasks: Cloudflare Pages CI/CD

**Feature**: 007 - Cloudflare Pages CI/CD
**Branch**: `007-cloudflare-pages-cicd`

## Prerequisites

- [ ] Cloudflare account with Pages access
- [ ] Repository admin access to add secrets

## Tasks

### Task 1: Create GitHub Actions Workflow
**File**: `.github/workflows/deploy-web.yml`
**Priority**: High
**Dependencies**: None

```yaml
# Workflow structure:
# - Trigger: push to main, pull_request
# - Jobs:
#   1. build: Setup pnpm, install, build, test
#   2. deploy: Deploy to Cloudflare Pages (main only)
```

**Acceptance Criteria**:
- [ ] Workflow triggers on push to main
- [ ] Workflow triggers on PR open/update
- [ ] pnpm dependencies are cached
- [ ] `pnpm version:sync` runs before build
- [ ] Build succeeds with `pnpm build`
- [ ] Tests pass before deployment
- [ ] Deployment only happens on main branch

### Task 2: Add Cloudflare Secrets to GitHub
**Priority**: High
**Dependencies**: None

Add repository secrets at Settings > Secrets and variables > Actions:
- `CLOUDFLARE_API_TOKEN` - Create with "Cloudflare Pages:Edit" permission
- `CLOUDFLARE_ACCOUNT_ID` - From Cloudflare dashboard

**Acceptance Criteria**:
- [ ] Secrets added to repository
- [ ] Secrets accessible in workflow

### Task 3: Create Cloudflare Pages Project
**Priority**: High
**Dependencies**: None

Option A: Via Dashboard
1. Go to Cloudflare Dashboard > Pages
2. Create project, connect GitHub repo
3. Configure build settings (but we'll use Actions, so minimal config)

Option B: Via Wrangler (optional)
```bash
wrangler pages project create ev-overlay-web
```

**Acceptance Criteria**:
- [ ] Pages project created
- [ ] Project name noted for workflow

### Task 4: Implement Deploy Step in Workflow
**Priority**: High
**Dependencies**: Task 1, Task 2, Task 3

Add deploy step using `cloudflare/pages-action`:
```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: ev-overlay-web
    directory: apps/web/dist
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Acceptance Criteria**:
- [ ] Deploy step added to workflow
- [ ] Deploy uses correct directory (`apps/web/dist`)
- [ ] Deploy includes PR comment support

### Task 5: Test End-to-End
**Priority**: High
**Dependencies**: Task 4

**Steps**:
1. Push this branch (`007-cloudflare-pages-cicd`)
2. Create PR to `main`
3. Verify workflow runs and creates preview
4. Merge PR
5. Verify production deployment

**Acceptance Criteria**:
- [ ] PR triggers workflow
- [ ] Preview deployment created
- [ ] Preview URL accessible
- [ ] Merge triggers production deployment
- [ ] Production site loads correctly

### Task 6: Update Documentation
**Priority**: Medium
**Dependencies**: Task 5

Update files:
- `CLAUDE.md`: Add deployment section
- `specs/007-cloudflare-pages-cicd/quickstart.md`: Create quick reference

**Acceptance Criteria**:
- [ ] CLAUDE.md includes deployment process
- [ ] Quickstart guide created

## Optional Tasks

### Task 7: Add PR Preview Comments
**Priority**: Low
**Dependencies**: Task 4

Enhance workflow to post PR comments with preview URLs using `actions/github-script`.

### Task 8: Add Build Status Badge
**Priority**: Low
**Dependencies**: Task 5

Add workflow status badge to `README.md`.

## Task Order

```
Task 1 ─┬── Task 2 ─┬── Task 3 ─┬── Task 4 ─┬── Task 5 ─┬── Task 6
        │           │           │           │           │
        └───────────┴───────────┴───────────┴───────────┴── (parallel setup)
```

## Verification Checklist

- [ ] Push to main deploys to production
- [ ] PR creates preview deployment
- [ ] Build fails block deployment
- [ ] Build completes under 3 minutes
- [ ] Site accessible at Cloudflare Pages URL
