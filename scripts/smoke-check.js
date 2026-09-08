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
  'setupScreen', 'promptScreen', 'activeScreen', 'historyScreen', 'timerDisplay', 'cycleNextAction',
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
  'window.addEventListener(eventName',
  'renderTargetPanel(completed)',
  'renderEnergyPanel(completed)',
  'renderWisdomPanel()',
  'renderHazardPanel()',
  'id="firstRunBanner"',
  'id="methodHelp"',
  'Plan · Focus · Review',
  'data-mode="deep"',
  'data-mode="brown"',
  'id="timerProgress"',
  'function animatePhaseChange()',
  '.active-screen.phase-pop',
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
  'function isMiniActive()',
  'id="prefsMenu"',
  'id="bgSwatches"',
  'id="bgGradients"',
  'function setFill(css)',
  'function renderSwatches()',
  'class="intent-hide"',
  'function applyDisplayPrefs()',
  'function setQuote(i)',
  'id="quotePrev"',
  'id="quoteNext"',
  'musicVolume',
  'dailyGoalMinutes',
  'applySessionPreset',
  'renderDailyGoal',
  "data-preset=\"start\"",
  "data-preset=\"admin\"",
  'function priorNextAction',
  "'rev_next_action'",
  "'sprint_next_action'",
  'plan_next_action',
  'review_next_action'
]) {
  if (!html.includes(marker)) throw new Error(`Expected hardening/history marker missing: ${marker}`);
}
if (!main.includes("ipcMain.handle('save-history-csv'")) throw new Error('Native CSV export handler missing');
if (!main.includes('function isTrustedAppFrame(event)')) throw new Error('CSV export sender validation missing');
if (!fs.readFileSync('preload.js', 'utf8').includes('saveHistoryCsv')) throw new Error('Native CSV export bridge missing');
if (html.includes('class="method-strip"')) throw new Error('Setup method strip should remain removed');
if (html.includes('navigator.geolocation')) throw new Error('Precise geolocation should not be requested');
// v1.3.0 removes YouTube streaming and its CSP frame-src allowance
if (html.includes('youtube') || html.includes('frame-src')) throw new Error('YouTube/frame-src remnants should be removed in v1.3.0');
if (main.includes('youtube') || main.includes('frame-src')) throw new Error('main.js YouTube/frame-src remnants should be removed in v1.3.0');

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('No inline script found');
for (const [i, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `index.html<script ${i + 1}>` });
}

// New installs use scenic photos; saved photo, fill, and legacy color choices survive.
const stateCode = html.slice(html.indexOf('const LS_KEY ='), html.indexOf('function saveState()'));
const assert = require('node:assert/strict');
for (const [settings, expected] of [
  [null, null],
  [{}, null],
  [{ bgFill: null, solidColor: '#654321' }, null],
  [{ bgFill: 'linear-gradient(160deg, #001e3c 0%, #003b6f 100%)' }, 'linear-gradient(160deg, #001e3c 0%, #003b6f 100%)'],
  [{ bgFill: null, bgIndex: 2 }, null],
  [{ bgFill: '#123456' }, '#123456'],
  [{ solidColor: '#654321' }, '#654321']
]) {
  const context = vm.createContext({
    structuredClone,
    localStorage: {
      getItem: () => settings === null ? null : JSON.stringify({ version: 2, settings }),
      removeItem() {}
    }
  });
  vm.runInContext(stateCode, context);
  assert.equal(vm.runInContext('state.settings.bgFill', context), expected);
  if (settings?.bgIndex) assert.equal(vm.runInContext('state.settings.bgIndex', context), settings.bgIndex);
}
assert.ok(!/<link\b[^>]*rel="preconnect"/i.test(html), 'Local defaults must not preconnect to external services');

// Exercise the new local generators, volume changes, toggling, and source cleanup.
const audioCode = html.slice(html.indexOf('const MUSIC_MODES ='), html.indexOf('/* Music menu —'));
const audioContext = vm.createContext({});
vm.runInContext(`
  const state = { settings: { musicVolume: 0.65, musicMode: 'off' } };
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const parameter = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({
    gain: parameter(), frequency: parameter(), Q: parameter(),
    connect() {}, disconnect() { this.disconnected = true; },
    start() { this.started = true; }, stop() { this.stopped = true; }
  });
  let audioCtx = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: {},
    createGain: node, createOscillator: node, createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) })
  };
  const pendingStops = [];
  const setTimeout = callback => pendingStops.push(callback);
  const clearInterval = () => {};
  const saveState = () => {};
  const showToast = () => {};
  const renderMusicMenu = () => {};
  const document = { getElementById: () => ({ classList: { toggle() {} } }) };
`, audioContext);
vm.runInContext(audioCode, audioContext);
vm.runInContext(`
  for (const [mode, count, level] of [['deep', 2, 0.08], ['brown', 1, 0.12]]) {
    assert(MUSIC_MODES.includes(mode) && MUSIC_LABELS[mode], 'Sound registration missing');
    setMusicMode(mode);
    assert(musicNodes && musicNodes.sources.length === count, 'Sound graph missing');
    const graph = musicNodes;
    assert(graph.sources.every(source => source.started), 'Sound did not start');
    assert(Math.abs(graph.master.gain.value - level * state.settings.musicVolume) < 1e-9, 'Wrong initial volume');
    state.settings.musicVolume = 0;
    applyMusicVolume();
    assert(graph.master.gain.value === 0, 'Volume zero must mute');
    state.settings.musicVolume = 0.5;
    applyMusicVolume();
    assert(graph.master.gain.value === level * 0.5, 'Volume update failed');
    toggleMusic();
    assert(musicNodes === null && state.settings.musicMode === 'off', 'Toggle off failed');
    pendingStops.splice(0).forEach(callback => callback());
    assert(graph.sources.every(source => source.stopped) && graph.master.disconnected, 'Sound cleanup failed');
    toggleMusic();
    assert(state.settings.musicMode === mode && musicNodes, 'Last sound was not restored');
    stopMusic();
    pendingStops.splice(0).forEach(callback => callback());
  }
`, audioContext);

console.log('Smoke check passed');
