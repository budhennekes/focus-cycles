// electron-packager won't apply our .icns on this setup (it looks for a bogus
// ".icon" extension and skips), so stamp the icon in after packaging: copy
// build/icon.icns into the app bundle and point CFBundleIconFile at it.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const app = process.argv[2] || 'dist/Focus Cycles-darwin-arm64/Focus Cycles.app';
const resources = path.join(app, 'Contents', 'Resources');
const plist = path.join(app, 'Contents', 'Info.plist');

if (!fs.existsSync(resources)) {
  console.error('stamp-icon: built app not found at ' + app);
  process.exit(1);
}

fs.copyFileSync('build/icon.icns', path.join(resources, 'icon.icns'));
try { fs.unlinkSync(path.join(resources, 'electron.icns')); } catch {}
try {
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleIconFile icon', plist]);
} catch {
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Add :CFBundleIconFile string icon', plist]);
}
console.log('stamp-icon: applied build/icon.icns');
