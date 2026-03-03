#!/usr/bin/env node
/**
 * Inject version into Worker source file before deployment
 * Run this BEFORE deploying the worker (unlike inject-version.js which runs after build)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const rootPkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const version = rootPkg.version;
const commit = process.env.GITHUB_SHA?.slice(0, 7) || 'dev';

console.log(`🏷️  Injecting version ${version} (commit: ${commit}) into Worker source...`);

// Inject into worker source (src/index.ts)
const workerSource = resolve('workers/api/src/index.ts');
try {
  let content = readFileSync(workerSource, 'utf8');
  content = content.replace(/__APP_VERSION__/g, version);
  content = content.replace(/__GIT_COMMIT__/g, commit);
  writeFileSync(workerSource, content);
  console.log(`  ✓ Injected version into ${workerSource}`);
} catch (e) {
  console.error(`  ❌ Failed to inject version:`, e.message);
  process.exit(1);
}

console.log(`\n✅ Worker version injection complete`);
