#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { packager } = require('@electron/packager');
const { sign, flat } = require('@electron/osx-sign');

const root = path.resolve(__dirname, '..');
const unsigned = process.argv.includes('--unsigned');
const appIdentity = process.env.MAS_APP_IDENTITY;
const installerIdentity = process.env.MAS_INSTALLER_IDENTITY;
const provisioningProfile = process.env.MAS_PROVISIONING_PROFILE;

function fail(message) {
  console.error(`\nMac App Store build blocked: ${message}\n`);
  process.exit(1);
}

if (process.platform !== 'darwin') fail('this build must run on macOS.');
if (!unsigned) {
  if (!appIdentity) fail('set MAS_APP_IDENTITY to your Mac App Distribution certificate name.');
  if (!installerIdentity) fail('set MAS_INSTALLER_IDENTITY to your Mac Installer Distribution certificate name.');
  if (!provisioningProfile || !fs.existsSync(provisioningProfile)) {
    fail('set MAS_PROVISIONING_PROFILE to an existing Mac App Store distribution provisioning profile.');
  }
}

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
  const output = path.join(root, 'dist-mas');
  if (fs.existsSync(output)) {
    const previous = output + '.previous-' + Date.now();
    fs.renameSync(output, previous);
    console.log('Previous build preserved at ' + previous);
  }
  const appPaths = await packager({
    dir: root,
    name: 'Focus Cycles',
    platform: 'mas',
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
  if (!fs.existsSync(appPath)) fail(`packager did not create ${appPath}.`);
  execFileSync(process.execPath, [path.join(root, 'scripts', 'stamp-icon.js'), appPath], { stdio: 'inherit' });

  if (unsigned) {
    console.log(`Unsigned MAS target created at ${appPath}`);
    return;
  }

  await sign({
    app: appPath,
    platform: 'mas',
    type: 'distribution',
    identity: appIdentity,
    provisioningProfile,
    optionsForFile: (filePath) => ({
      entitlements: filePath === appPath
        ? path.join(root, 'build', 'entitlements.mas.plist')
        : path.join(root, 'build', 'entitlements.mas.inherit.plist'),
      hardenedRuntime: false
    })
  });

  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' });

  const pkgPath = path.join(root, 'dist-mas', 'Focus-Cycles.pkg');
  await flat({
    app: appPath,
    pkg: pkgPath,
    platform: 'mas',
    identity: installerIdentity
  });
  execFileSync('pkgutil', ['--check-signature', pkgPath], { stdio: 'inherit' });
  console.log(`App Store package created at ${pkgPath}`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
