# Deployment Cleanup Checklist

**Feature**: 006-cloudflare-edge-arch
**Purpose**: ตรวจสอบและลบสิ่งที่ไม่จำเป็นต้อง Deploy
**Created**: 2026-03-08

---

## 🔴 สิ่งที่ต้องลบออกก่อน Deploy

### Scripts ที่ใช้เฉพาะช่วง Migration
- [ ] `scripts/shadow-traffic.sh` - ใช้แค่ตอน migration phase
- [ ] `scripts/migration-monitoring.sh` - ใช้แค่ตอน migration
- [ ] `scripts/verify-kv-ttl.js` - verification script ชั่วคราว
- [ ] `scripts/verify-staging.js` - staging verification
- [ ] `scripts/verify-rollforward.sh` - ใช้ตอน cutover
- [ ] `scripts/test-rollback.sh` - ใช้ตอน test rollback
- [ ] `scripts/d1-cleanup.js` - cleanup script ครั้งเดียว

### Documentation สำหรับ Migration Phase
- [ ] `scripts/MONITORING-GUIDE.md` - ใช้แค่ช่วง migration
- [ ] `scripts/decommission-plan.md` - plan สำหรับลบ old infra
- [ ] `scripts/deployment-tracker.md` - ติดตาม deployment

### Temporary Reports
- [ ] `monitoring-reports/` - directory ทั้งหมด (ถ้ามีข้อมูลชั่วคราว)

### Lock Files ที่สร้างระหว่างทำงาน
- [ ] `.claude/scheduled_tasks.lock` - lock file ชั่วคราว

---

## 🟡 สิ่งที่ตรวจสอบว่ายังจำเป็นอยู่ไหม

### Scripts ที่อาจไม่จำเป็นแล้ว
- [ ] `scripts/deploy-staging.sh` - ใช้ deploy ไป staging ยัง?
- [ ] `scripts/r2-lifecycle/` - ใช้งานอยู่หรือไม่?
- [ ] `scripts/start-e2e-servers.js` - ใช้สำหรับ E2E tests อยู่ไหม?

### Specs Phase2 (ยังไม่เริ่ม)
- [ ] `specs/006-cloudflare-edge-arch/phase2-proposal.md` - เก็บไว้แต่ยังไม่ implement
- [ ] `specs/006-cloudflare-edge-arch/rollback-procedures.md` - ยังจำเป็นหรือไม่ (standby 30 วัน)
- [ ] `specs/006-cloudflare-edge-arch/runbook.md` - ใช้งานจริงหรือไม่?

### Contracts & Docs ที่ implement แล้ว
- [ ] `specs/006-cloudflare-edge-arch/contracts/queue-schemas.md` - reference หรือ archive?
- [ ] `specs/006-cloudflare-edge-arch/data-model.md` - ยังอ้างอิงอยู่ไหม?
- [ ] `specs/006-cloudflare-edge-arch/research.md` - archive ได้หรือยัง?

---

## 🟢 สิ่งที่ต้อง Deploy (อย่าลบ!)

### Core Application
- [ ] `apps/web/src/` - Vue frontend (ทั้งหมด)
- [ ] `workers/api/src/` - Worker API (ทั้งหมด)
- [ ] `packages/core/` - Core logic (ไม่เปลี่ยน)

### Config Files
- [ ] `workers/api/wrangler.toml` - Worker config (ตรวจสอบ binding ถูกต้อง)
- [ ] `apps/web/wrangler.toml` - Pages config
- [ ] `.github/workflows/deploy-pages.yml` - Deploy workflow
- [ ] `.github/workflows/security-audit.yml` - Security workflow

### Database
- [ ] `db/migrations/` - ต้องมีสำหรับ D1
- [ ] `db/schema.sql` - Schema reference

---

## 📝 Pre-Deploy Checklist

### Code Quality
- [ ] ไม่มี console.log ที่ไม่จำเป็น
- [ ] ไม่มี TODO comments ที่ยังไม่ทำ
- [ ] ไม่มี hardcoded secrets
- [ ] ไม่มี test data ใน production code

### Environment
- [ ] `wrangler.toml` binding ถูกต้อง (prod)
- [ ] Secrets ตั้งค่าครบ (GOOGLE_MAPS_API_KEY, OPENCHARGEMAP_API_KEY)
- [ ] D1 migrations รันครบแล้วบน production
- [ ] KV namespaces binding ถูกต้อง

### Git
- [ ] Branch สะอาด (ไม่มีไฟล์ที่ไม่เกี่ยวข้อง)
- [ ] Commit messages ชัดเจน
- [ ] `.gitignore` มี rules ครบถ้วน

---

## 🗑️ สรุปสิ่งที่จะลบ

| ไฟล์/โฟลเดอร์ | เหตุผล | สถานะ |
|--------------|--------|-------|
| `scripts/shadow-traffic.sh` | Migration complete | ⏳ |
| `scripts/migration-monitoring.sh` | Migration complete | ⏳ |
| `scripts/verify-*.js/sh` | Verification scripts ชั่วคราว | ⏳ |
| `scripts/d1-cleanup.js` | One-time use | ⏳ |
| `scripts/MONITORING-GUIDE.md` | Phase-specific | ⏳ |
| `scripts/decommission-plan.md` | Legacy tracking | ⏳ |
| `scripts/deployment-tracker.md` | Completed | ⏳ |
| `monitoring-reports/` | Temporary data | ⏳ |
| `.claude/scheduled_tasks.lock` | Lock file | ⏳ |

---

## ✅ Final Verification

ก่อน Deploy ตรวจสอบ:
- [ ] ไฟล์ที่ไม่จำเป็นทั้งหมดถูกลบออกจาก branch
- [ ] `.gitignore` ignore ไฟล์ที่ไม่ควน commit
- [ ] `git status` แสดงแค่ไฟล์ที่จะ deploy จริง ๆ
