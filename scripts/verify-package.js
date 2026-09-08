#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const asar = require('@electron/asar');

const appPath = process.argv[2];
if (!appPath || !fs.existsSync(appPath)) {
  console.error('Usage: node scripts/verify-package.js "/path/to/Focus Cycles.app"');
  process.exit(1);
}

const plist = path.join(appPath, 'Contents', 'Info.plist');
const resources = path.join(appPath, 'Contents', 'Resources');
const archive = path.join(resources, 'app.asar');
const icon = path.join(resources, 'icon.icns');
for (const required of [plist, archive, icon]) {
  if (!fs.existsSync(required)) throw new Error(`Missing packaged file: ${required}`);
}

const plistValue = key => execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim();
if (plistValue('CFBundleIdentifier') !== 'com.bud.focuscycles') throw new Error('Unexpected bundle identifier');
if (plistValue('CFBundleIconFile') !== 'icon') throw new Error('Packaged app icon is not configured');
if (plistValue('LSApplicationCategoryType') !== 'public.app-category.productivity') throw new Error('Unexpected app category');

const packageVersion = require(path.resolve(__dirname, '..', 'package.json')).version;
if (plistValue('CFBundleShortVersionString') !== packageVersion) throw new Error('Packaged version does not match package.json');

const archiveBytes = fs.statSync(archive).size;
if (archiveBytes > 5 * 1024 * 1024) throw new Error(`app.asar is unexpectedly large: ${archiveBytes} bytes`);
const entries = asar.listPackage(archive);
const forbidden = entries.filter(entry =>
  entry.includes('.overnight-npm-temp-backup') ||
  entry.startsWith('/dist') ||
  entry.startsWith('/docs') ||
  entry.startsWith('/scripts')
);
if (forbidden.length) throw new Error(`Excluded files found in package: ${forbidden.slice(0, 5).join(', ')}`);

console.log(JSON.stringify({
  app: appPath,
  bundleId: plistValue('CFBundleIdentifier'),
  version: packageVersion,
  archiveBytes,
  entries: entries.length
}));
