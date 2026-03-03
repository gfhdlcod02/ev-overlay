#!/usr/bin/env node
/**
 * Sync version from root package.json to all workspace packages
 * Run this before build/deploy to ensure all versions match
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Read root version
const rootPkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
const version = rootPkg.version;

console.log(`🔄 Syncing version ${version} to all packages...`);

const packages = [
  'apps/web/package.json',
  'workers/api/package.json',
  'packages/core/package.json',
];

let changed = 0;
for (const pkgPath of packages) {
  const fullPath = resolve(rootDir, pkgPath);
  const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));

  if (pkg.version !== version) {
    pkg.version = version;
    writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  ✓ ${pkgPath}: ${pkg.version}`);
    changed++;
  } else {
    console.log(`  ✓ ${pkgPath}: already ${version}`);
  }
}

console.log(`\n✅ Synced ${changed} packages to version ${version}`);
