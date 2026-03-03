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

// Inject into worker (replace placeholders in built source)
const workerSource = 'workers/api/dist/index.js';
try {
  let content = readFileSync(workerSource, 'utf8');
  content = content.replace(/__APP_VERSION__/g, version);
  content = content.replace(/__GIT_COMMIT__/g, commit);
  writeFileSync(workerSource, content);
  console.log(`  ✓ Injected version into worker`);
} catch (e) {
  console.log(`  ⚠️  Worker build not found, skipping`);
}

console.log(`\n✅ Version injection complete`);
