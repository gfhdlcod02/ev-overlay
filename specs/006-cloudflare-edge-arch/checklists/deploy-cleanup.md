# Deployment Cleanup Checklist

**Feature**: 006-cloudflare-edge-arch
**Purpose**: ตรวจสอบและลบสิ่งที่ไม่จำเป็นต้อง Deploy
**Created**: 2026-03-08
**Updated**: 2026-03-18

---

## 🔴 สิ่งที่ต้องลบออกก่อน Deploy

### Scripts ที่ใช้เฉพาะช่วง Migration

- [x] `scripts/shadow-traffic.sh` - ใช้แค่ตอน migration phase (already cleaned up)
- [x] `scripts/migration-monitoring.sh` - ใช้แค่ตอน migration (already cleaned up)
- [x] `scripts/verify-kv-ttl.js` - verification script ชั่วคราว (already cleaned up)
- [x] `scripts/verify-staging.js` - staging verification (already cleaned up)
- [x] `scripts/verify-rollforward.sh` - ใช้ตอน cutover (already cleaned up)
- [x] `scripts/test-rollback.sh` - ใช้ตอน test rollback (already cleaned up)
- [x] `scripts/d1-cleanup.js` - cleanup script ครั้งเดียว (already cleaned up)

### Documentation สำหรับ Migration Phase

- [x] `scripts/MONITORING-GUIDE.md` - ใช้แค่ช่วง migration (already cleaned up)
- [x] `scripts/decommission-plan.md` - plan สำหรับลบ old infra (already cleaned up)
- [x] `scripts/deployment-tracker.md` - ติดตาม deployment (already cleaned up)

### Temporary Reports

- [x] `monitoring-reports/` - directory ทั้งหมด (already cleaned up)

### Lock Files ที่สร้างระหว่างทำงาน

- [x] `.claude/scheduled_tasks.lock` - lock file (already cleaned up)

---

## 🟡 สิ่งที่ตรวจสอบว่ายังจำเป็นอยู่ไหม

### Scripts ที่อาจไม่จำเป็นแล้ว

- [x] `scripts/deploy-staging.sh` - ✅ **KEEP** - Required for ongoing staging deployments
- [x] `scripts/r2-lifecycle/` - ✅ **KEEP** - R2 lifecycle management still needed
- [x] `scripts/start-e2e-servers.js` - ✅ **KEEP** - Required for E2E testing

### Specs Phase2 (ยังไม่เริ่ม)

- [x] `specs/006-cloudflare-edge-arch/phase2-proposal.md` - ✅ **ARCHIVED** - Moved to `archive/` folder
- [x] `specs/006-cloudflare-edge-arch/rollback-procedures.md` - ✅ **ARCHIVED** - 30-day standby complete, moved to `archive/` folder
- [x] `specs/006-cloudflare-edge-arch/runbook.md` - ✅ **ARCHIVED** - Moved to `archive/` folder

### Contracts & Docs ที่ implement แล้ว

- [x] `specs/006-cloudflare-edge-arch/contracts/queue-schemas.md` - ✅ **KEEP** - Reference for queue message formats
- [x] `specs/006-cloudflare-edge-arch/data-model.md` - ✅ **KEEP** - Active reference for D1 schema
- [x] `specs/006-cloudflare-edge-arch/research.md` - ✅ **KEEP** - Reference for technology decisions

---

## 🟢 สิ่งที่ต้อง Deploy (อย่าลบ!)

### Core Application

- [x] `apps/web/src/` - Vue frontend (ทั้งหมด)
- [x] `workers/api/src/` - Worker API (ทั้งหมด)
- [x] `packages/core/` - Core logic (ไม่เปลี่ยน)

### Config Files

- [x] `workers/api/wrangler.toml` - Worker config (ตรวจสอบ binding ถูกต้อง)
- [x] `apps/web/wrangler.toml` - Pages config
- [x] `.github/workflows/deploy-pages.yml` - Deploy workflow
- [x] `.github/workflows/security-audit.yml` - Security workflow

### Database

- [x] `db/migrations/` - ต้องมีสำหรับ D1
- [x] `db/schema.sql` - Schema reference

---

## 📝 Pre-Deploy Checklist

### Code Quality

- [x] ไม่มี console.log ที่ไม่จำเป็น
- [x] ไม่มี TODO comments ที่ยังไม่ทำ
- [x] ไม่มี hardcoded secrets
- [x] ไม่มี test data ใน production code

### Environment

- [x] `wrangler.toml` binding ถูกต้อง (prod)
- [x] Secrets ตั้งค่าครบ (GOOGLE_MAPS_API_KEY, OPENCHARGEMAP_API_KEY)
- [x] D1 migrations รันครบแล้วบน production
- [x] KV namespaces binding ถูกต้อง

### Git

- [x] Branch สะอาด (ไม่มีไฟล์ที่ไม่เกี่ยวข้อง)
- [x] Commit messages ชัดเจน
- [x] `.gitignore` มี rules ครบถ้วน

---

## 🗑️ สรุปสิ่งที่จะลบ

| ไฟล์/โฟลเดอร์                     | เหตุผล                        | สถานะ            |
| --------------------------------- | ----------------------------- | ---------------- |
| `scripts/shadow-traffic.sh`       | Migration complete            | ✅ Already clean |
| `scripts/migration-monitoring.sh` | Migration complete            | ✅ Already clean |
| `scripts/verify-*.js/sh`          | Verification scripts ชั่วคราว | ✅ Already clean |
| `scripts/d1-cleanup.js`           | One-time use                  | ✅ Already clean |
| `scripts/MONITORING-GUIDE.md`     | Phase-specific                | ✅ Already clean |
| `scripts/decommission-plan.md`    | Legacy tracking               | ✅ Already clean |
| `scripts/deployment-tracker.md`   | Completed                     | ✅ Already clean |
| `monitoring-reports/`             | Temporary data                | ✅ Already clean |
| `.claude/scheduled_tasks.lock`    | Lock file                     | ✅ Already clean |

---

## ✅ Final Verification

ก่อน Deploy ตรวจสอบ:

- [x] ไฟล์ที่ไม่จำเป็นทั้งหมดถูกลบออกจาก branch
- [x] `.gitignore` ignore ไฟล์ที่ไม่ควน commit
- [x] `git status` แสดงแค่ไฟล์ที่จะ deploy จริง ๆ

---

**Status**: ✅ **CLEANUP COMPLETE** - All migration artifacts removed or archived
