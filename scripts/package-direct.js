#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { packager } = require('@electron/packager');

const root = path.resolve(__dirname, '..');
const ignored = [
  /^\/dist(?:-mas)?$/,
  /^\/dist(?:-mas)?\.previous-/,
  /(?:^|\/)\.env(?:\.|$)/,
  /\.(?:p12|pfx|pem|key|provisionprofile|mobileprovision)$/i,
  /^\/signing(?:\/|$)/,
  /^\/build$/,
  /^\/tasks$/,
  /^\/scripts$/,
  /^\/docs$/,
  /^\/\.github$/,
  /^\/\.claude$/,
  /^\/\.overnight-npm-temp-backup/,
  /^\/node_modules\.dataless-broken-/,
  /^\/\.gitignore$/,
  /\.md$/,
  /^\/node_modules\/\.electron-/
];

(async () => {
  const buildVersion = process.env.FOCUS_BUILD_NUMBER || require('../package.json').version;
  if (!/^[1-9]\d{0,3}(?:\.\d{1,2}){0,2}$/.test(buildVersion)) throw new Error('Invalid FOCUS_BUILD_NUMBER. Use a numeric build such as 1.4.1.');
  const output = path.join(root, 'dist');
  if (fs.existsSync(output)) {
    const previous = output + '.previous-' + Date.now();
    fs.renameSync(output, previous);
    console.log('Previous build preserved at ' + previous);
  }
  const appPaths = await packager({
    dir: root,
    name: 'Focus Cycles',
    platform: 'darwin',
    arch: 'arm64',
    overwrite: false,
    asar: true,
    buildVersion,
    out: output,
    appBundleId: 'com.bud.focuscycles',
    appCategoryType: 'public.app-category.productivity',
    extendInfo: path.join(root, 'build', 'Info.plist'),
    ignore: ignored
  });
  const appPath = path.join(appPaths[0], 'Focus Cycles.app');
  if (!fs.existsSync(appPath)) throw new Error(`Packager did not create ${appPath}.`);
  execFileSync(process.execPath, [path.join(root, 'scripts', 'stamp-icon.js'), appPath], { stdio: 'inherit' });
  console.log(`Direct-distribution app created at ${appPath}`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
