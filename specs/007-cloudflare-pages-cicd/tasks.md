# Tasks: Cloudflare Pages CI/CD

**Feature**: 007 - Cloudflare Pages CI/CD
**Branch**: `007-cloudflare-pages-cicd`

## Prerequisites

- [x] Cloudflare account with Pages access
- [ ] Repository admin access to add secrets

## Tasks

### Task 1: Create GitHub Actions Workflow ✅
**File**: `.github/workflows/deploy-web.yml`
**Priority**: High
**Dependencies**: None

**Acceptance Criteria**:
- [x] Workflow triggers on push to main
- [x] Workflow triggers on PR open/update
- [x] pnpm dependencies are cached
- [x] `pnpm version:sync` runs before build
- [x] Build succeeds with `pnpm build`
- [x] Tests pass before deployment
- [x] Deployment only happens on main branch

### Task 2: Add Cloudflare Secrets to GitHub ✅
**Priority**: High
**Dependencies**: None

Add repository secrets at Settings > Secrets and variables > Actions:
- `CLOUDFLARE_API_TOKEN` - Create with "Cloudflare Pages:Edit" permission
- `CLOUDFLARE_ACCOUNT_ID` - From Cloudflare dashboard

**Status**: Secrets already configured (created 2026-03-03)

**Acceptance Criteria**:
- [x] Secrets added to repository
- [x] Secrets accessible in workflow

### Task 3: Create Cloudflare Pages Project ✅
**Priority**: High
**Dependencies**: None

**Result**: Project `ev-overlay` already exists (created 2 weeks ago)
- Domain: `ev-overlay.pages.dev`

**Acceptance Criteria**:
- [x] Pages project exists
- [x] Project name updated in workflow (`ev-overlay`, not `ev-overlay-web`)

### Task 4: Implement Deploy Step in Workflow ✅
**Priority**: High
**Dependencies**: Task 1, Task 2, Task 3

Deploy step implemented using `cloudflare/pages-action@v1`:
- Production deploy on push to main
- Preview deploy on PR

**Acceptance Criteria**:
- [x] Deploy step added to workflow
- [x] Deploy uses correct directory (`apps/web/dist`)
- [x] Deploy includes PR comment support

### Task 5: Test End-to-End ✅
**Priority**: High
**Dependencies**: Task 4

**Steps**:
1. ✅ Push this branch (`007-cloudflare-pages-cicd`)
2. ✅ Create PR to `main`
3. ✅ Verify workflow runs and creates preview
4. ⏳ Merge PR to test production deployment
5. ⏳ Verify production site loads

**Results**:
- PR #35 created: https://github.com/gfhdlcod02/ev-overlay/pull/35
- Preview deployment: https://e28a114c.ev-overlay.pages.dev
- Workflow: Build 32s, Deploy 62s

**Acceptance Criteria**:
- [x] PR triggers workflow
- [x] Preview deployment created
- [x] Preview URL accessible
- [ ] Merge triggers production deployment
- [ ] Production site loads correctly

### Task 6: Update Documentation ✅
**Priority**: Medium
**Dependencies**: Task 5

**Completed**:
- ✅ `CLAUDE.md`: Added "Deployment" section with CI/CD details
- ✅ `specs/007-cloudflare-pages-cicd/quickstart.md`: Created quick reference

**Acceptance Criteria**:
- [x] CLAUDE.md includes deployment process
- [x] Quickstart guide created

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
