#!/usr/bin/env node
/**
 * Inject version into built files for runtime access
 * Run this after build to embed version in apps
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = rootPkg.version;
const buildTime = new Date().toISOString();
const commit = process.env.GITHUB_SHA?.slice(0, 7) || 'dev';

console.log(`🏷️  Injecting version ${version} (commit: ${commit}) into builds...`);

// Inject into web app (create version.json for runtime)
const webDist = 'apps/web/dist';
try {
  const versionInfo = { version, buildTime, commit };
  writeFileSync(
    resolve(webDist, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
  console.log(`  ✓ Created ${webDist}/version.json`);
} catch (e) {
  console.log(`  ⚠️  Web dist not found, skipping`);
}

// Note: Worker version is injected in source before build via inject-version-worker.js

console.log(`\n✅ Version injection complete`);
