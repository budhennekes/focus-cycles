#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');

const requiredFiles = ['package.json', 'main.js', 'index.html', 'manifest.json'];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.main !== 'main.js') throw new Error('package.json main must be main.js');

const main = fs.readFileSync('main.js', 'utf8');
new vm.Script(main, { filename: 'main.js' });

const html = fs.readFileSync('index.html', 'utf8');
for (const id of [
  'setupScreen', 'promptScreen', 'activeScreen', 'historyScreen', 'timerDisplay',
  'statGrid', 'bars', 'sessionList', 'targetPanel', 'targetRing', 'energyPanel',
  'energyBars', 'energyLabels', 'wisdomPanel', 'wisdomList', 'hazardPanel', 'hazardList'
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing required UI element #${id}`);
}
for (const marker of [
  'Content-Security-Policy',
  'function startRunner()',
  'function stopRunner()',
  'Math.max(0, timerState.pausedRemainingMs || 0)',
  'encodeURIComponent(lat)',
  'window.addEventListener(eventName',
  'renderTargetPanel(completed)',
  'renderEnergyPanel(completed)',
  'renderWisdomPanel()',
  'renderHazardPanel()',
  'function currentVisibleScreen()',
  'screenBeforeHistory = visible',
  'id="shortcutsOverlay"',
  'function toggleShortcuts',
  'function startMusic',
  'function stopMusic',
  'function toggleMusic',
  'function setMusicMode',
  'id="musicMenu"',
  "musicMode = 'off'",
  'Pre-paint theme resolution',
  'function celebrate()',
  'function completionMessage()',
  'function sprintExample()',
  'id="miniBtn"',
  'function setCompactWindow(on)',
  'function isMiniActive()'
]) {
  if (!html.includes(marker)) throw new Error(`Expected hardening/history marker missing: ${marker}`);
}

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('No inline script found');
for (const [i, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `index.html<script ${i + 1}>` });
}

console.log('Smoke check passed');
