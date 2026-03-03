#!/usr/bin/env node
/**
 * Release script - Bump version, sync to all packages, and create git tag
 * Usage: node scripts/release.js <version>
 * Example: node scripts/release.js 1.3.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('❌ Please provide a valid version (e.g., 1.3.0)');
  process.exit(1);
}

console.log(`🚀 Starting release v${version}...\n`);

// Step 1: Update root package.json
try {
  const rootPkgPath = resolve('package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
  rootPkg.version = version;
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log(`✅ Updated root package.json to v${version}`);
} catch (e) {
  console.error('❌ Failed to update root package.json:', e.message);
  process.exit(1);
}

// Step 2: Sync to all packages
try {
  console.log('\n🔄 Syncing to all packages...');
  execSync('pnpm version:sync', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Failed to sync versions:', e.message);
  process.exit(1);
}

// Step 3: Stage all changes
try {
  execSync('git add package.json apps/web/package.json workers/api/package.json packages/core/package.json', {
    stdio: 'ignore',
  });
  console.log('\n✅ Staged version changes');
} catch (e) {
  console.error('❌ Failed to stage changes:', e.message);
  process.exit(1);
}

// Step 4: Commit
try {
  execSync(`git commit -m "chore(release): v${version}"`, { stdio: 'inherit' });
  console.log(`\n✅ Committed: chore(release): v${version}`);
} catch (e) {
  console.error('❌ Failed to commit:', e.message);
  process.exit(1);
}

// Step 5: Create tag
try {
  execSync(`git tag v${version}`, { stdio: 'ignore' });
  console.log(`\n✅ Created tag: v${version}`);
} catch (e) {
  console.error('❌ Failed to create tag:', e.message);
  process.exit(1);
}

// Step 6: Push
try {
  console.log('\n📤 Pushing to remote...');
  execSync('git push && git push --tags', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Failed to push:', e.message);
  process.exit(1);
}

console.log(`\n🎉 Release v${version} complete!`);
console.log('CI/CD will now deploy automatically.');
