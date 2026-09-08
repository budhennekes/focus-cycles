const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, shell, session, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');

app.setName('Focus Cycles');

const { pathToFileURL } = require('url');
const APP_URL = pathToFileURL(path.join(__dirname, 'index.html')).href;
const NORMAL_MIN = [480, 560];
let savedBounds = null;
let compact = false;
let quitting = false;
let dragOrigin = null;
let tray = null;
let trayMenuKey = '';
let lastCompactAvailability = null;
let windowStatus = { phase: 'idle', paused: false, seconds: 0 };
function isCompact() { return compact; }
function hasTimer() { return ['focus', 'break'].includes(windowStatus.phase); }
function canCompact() { return !!mainWin && !mainWin.isDestroyed() && hasTimer() && !compact && !mainWin.isFullScreen(); }
function isTrustedAppFrame(event) {
  return !!mainWin && !mainWin.isDestroyed() && event?.sender === mainWin.webContents &&
    event.senderFrame === mainWin.webContents.mainFrame && event.senderFrame?.url === APP_URL;
}
function clampBounds(bounds) {
  const area = screen.getDisplayMatching(bounds).workArea;
  const width = Math.min(bounds.width, area.width), height = Math.min(bounds.height, area.height);
  return { x: Math.round(Math.max(area.x, Math.min(bounds.x, area.x + area.width - width))),
    y: Math.round(Math.max(area.y, Math.min(bounds.y, area.y + area.height - height))), width, height };
}
function setCompact(on) {
  if (!mainWin || mainWin.isDestroyed() || on === compact || (on && !hasTimer())) return;
  dragOrigin = null;
  if (on) {
    if (mainWin.isFullScreen()) return; // Leave native full screen using its standard control first.
    if (mainWin.isMaximized()) mainWin.unmaximize();
    savedBounds = mainWin.getBounds();
    compact = true;
    mainWin.setMinimumSize(320, 100);
    mainWin.setWindowButtonVisibility(false);
    mainWin.setBounds(clampBounds({ ...savedBounds, width: 480, height: 112 }), false);
    mainWin.setResizable(false);
    mainWin.setAlwaysOnTop(true, 'floating');
  } else {
    compact = false;
    mainWin.setAlwaysOnTop(false);
    mainWin.setResizable(true);
    const restore = savedBounds || { ...mainWin.getBounds(), width: 1100, height: 900 };
    const bounds = clampBounds({ ...restore, width: Math.max(NORMAL_MIN[0], restore.width), height: Math.max(NORMAL_MIN[1], restore.height) });
    // A display smaller than the normal minimum must still contain the window.
    mainWin.setMinimumSize(Math.min(NORMAL_MIN[0], bounds.width), Math.min(NORMAL_MIN[1], bounds.height));
    mainWin.setBounds(bounds, false);
    mainWin.setWindowButtonVisibility(true);
    savedBounds = null;
  }
  mainWin.webContents.send('compact-state', compact);
  refreshMenus();
}
function showFullWindow() {
  if (!mainWin || mainWin.isDestroyed()) { createWindow(); return; }
  setCompact(false);
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.setBounds(clampBounds(mainWin.getBounds()), false);
  mainWin.show();
  mainWin.focus();
}
function sendTrayAction(action) {
  if (!hasTimer() || !['pause', 'skip', 'stop'].includes(action) || !mainWin || mainWin.isDestroyed()) return;
  mainWin.webContents.send('tray-action', action);
}
function statusLabel() {
  const labels = { idle: 'Ready to focus', focus: 'Focus', break: 'Break', planning: 'Plan your next focus', review: 'Ready for review', 'save-retry': 'Session needs saving' };
  return (windowStatus.paused ? 'Paused · ' : '') + labels[windowStatus.phase];
}
function buildTrayMenu() {
  const active = hasTimer();
  return Menu.buildFromTemplate([
    { id: 'status', label: statusLabel(), enabled: false },
    { id: 'show-full', label: 'Show full window', click: showFullWindow },
    { id: 'compact', label: 'Compact window', enabled: canCompact(), click: () => { if (!canCompact()) return; setCompact(true); if (mainWin?.isMinimized()) mainWin.restore(); mainWin?.show(); } },
    { type: 'separator' },
    { id: 'pause', label: windowStatus.paused ? 'Resume' : 'Pause', enabled: active, click: () => sendTrayAction('pause') },
    { id: 'skip', label: windowStatus.phase === 'break' ? 'Skip break' : 'Skip focus', enabled: active, click: () => sendTrayAction('skip') },
    { id: 'stop', label: 'Stop session', enabled: active, click: () => sendTrayAction('stop') },
    { type: 'separator' },
    { id: 'quit', label: 'Quit Focus Cycles', click: () => app.quit() }
  ]);
}
function refreshMenus() {
  const available = canCompact();
  const key = JSON.stringify([windowStatus.phase, windowStatus.paused, compact, available]);
  if (tray && key !== trayMenuKey) { tray.setContextMenu(buildTrayMenu()); trayMenuKey = key; }
  const item = Menu.getApplicationMenu()?.getMenuItemById('window-compact');
  if (item) item.enabled = available;
  if (mainWin && !mainWin.isDestroyed() && lastCompactAvailability !== available) {
    lastCompactAvailability = available;
    mainWin.webContents.send('compact-availability', available);
  }
}
function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  updateTray();
}
function updateTray() {
  if (!tray) return;
  const seconds = windowStatus.seconds;
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const title = hasTimer() ? `${windowStatus.paused ? 'Ⅱ ' : ''}${time}` : '';
  if (tray.getTitle() !== title) tray.setTitle(title, { fontType: 'monospacedDigit' });
  tray.setToolTip(`Focus Cycles · ${statusLabel()}${hasTimer() ? ' · ' + time : ''}`);
  refreshMenus();
}
function acceptStatus(value) {
  if (!value || typeof value !== 'object' || !['idle', 'focus', 'break', 'planning', 'review', 'save-retry'].includes(value.phase) ||
      typeof value.paused !== 'boolean' || typeof value.seconds !== 'number' || !Number.isFinite(value.seconds)) return false;
  const active = ['focus', 'break'].includes(value.phase);
  const next = { phase: value.phase, paused: active && value.paused, seconds: active ? Math.round(Math.max(0, Math.min(86400, value.seconds))) : 0 };
  if (JSON.stringify(next) === JSON.stringify(windowStatus)) return true;
  windowStatus = next;
  updateTray();
  return true;
}
ipcMain.on('window-status', (event, value) => { if (isTrustedAppFrame(event)) acceptStatus(value); });
ipcMain.on('set-compact', (event, on) => { if (isTrustedAppFrame(event) && typeof on === 'boolean') setCompact(on); });
ipcMain.on('window-controls-ready', event => {
  if (isTrustedAppFrame(event)) {
    mainWin.webContents.send('compact-state', compact);
    mainWin.webContents.send('compact-availability', canCompact());
  }
});
ipcMain.on('drag-start', event => { if (isTrustedAppFrame(event) && compact) dragOrigin = mainWin.getBounds(); });
ipcMain.on('drag-move', (event, dx, dy) => {
  if (!isTrustedAppFrame(event) || !compact || !dragOrigin || !Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 100000 || Math.abs(dy) > 100000) return;
  mainWin.setBounds(clampBounds({ ...dragOrigin, x: Math.round(dragOrigin.x + dx), y: Math.round(dragOrigin.y + dy) }), false);
});
ipcMain.on('drag-end', event => { if (isTrustedAppFrame(event)) dragOrigin = null; });

ipcMain.handle('save-history-csv', async (event, csv, suggestedName) => {
  if (!isTrustedAppFrame(event)) {
    return { ok: false, error: 'Untrusted export request.' };
  }
  if (typeof csv !== 'string' || csv.length > 10 * 1024 * 1024) {
    return { ok: false, error: 'Invalid export data.' };
  }
  const safeName = typeof suggestedName === 'string' && /^focus-history-\d{4}-\d{2}-\d{2}\.csv$/.test(suggestedName)
    ? suggestedName
    : 'focus-history.csv';
  const result = await dialog.showSaveDialog(mainWin, {
    title: 'Export Focus History',
    defaultPath: safeName,
    filters: [{ name: 'CSV file', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  await fs.writeFile(result.filePath, csv, 'utf8');
  return { ok: true };
});

// Offline Help does not inherit timer permissions or app storage.
function openLocalHelp(page) {
  if (!['privacy', 'support'].includes(page)) throw new Error('Unknown help document');
  const file = path.join(__dirname, page + '.html');
  const url = pathToFileURL(file).href;
  const win = new BrowserWindow({ width: 720, height: 760, minWidth: 480, minHeight: 400,
    show: false, title: page === 'privacy' ? 'Focus Cycles Privacy' : 'Focus Cycles Support',
    webPreferences: { partition: 'focus-help', sandbox: true, contextIsolation: true, nodeIntegration: false } });
  win.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(false));
  const external = target => { if (isSafeExternalUrl(target) || target === 'mailto:bud@aboundlessworld.com') shell.openExternal(target); };
  win.webContents.setWindowOpenHandler(({ url: target }) => { external(target); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, target) => { if (target !== url) { event.preventDefault(); external(target); } });
  win.loadFile(file);
  win.once('ready-to-show', () => win.show());
}

const isSafeExternalUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "connect-src 'self'",
  "font-src 'self' data:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

// Two instances would race each other's localStorage writes — allow only one.
let mainWin = null;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showFullWindow);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    minWidth: NORMAL_MIN[0],
    minHeight: NORMAL_MIN[1],
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWin = win;
  win.on('enter-full-screen', refreshMenus);
  win.on('leave-full-screen', refreshMenus);
  win.on('close', event => { if (!quitting) { event.preventDefault(); dragOrigin = null; win.hide(); } });
  win.on('blur', () => { dragOrigin = null; });
  win.on('closed', () => {
    if (mainWin === win) { mainWin = null; compact = false; savedBounds = null; dragOrigin = null; acceptStatus({ phase: 'idle', paused: false, seconds: 0 }); }
  });
  win.webContents.on('did-start-loading', () => acceptStatus({ phase: 'idle', paused: false, seconds: 0 }));
  win.webContents.on('render-process-gone', () => acceptStatus({ phase: 'idle', paused: false, seconds: 0 }));

  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Open external links in the default browser and deny any untrusted in-app navigation.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Apply our CSP only to the app's own documents.
    if (details.url.startsWith('file://')) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [CONTENT_SECURITY_POLICY]
        }
      });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'notifications' && webContents.getURL().startsWith('file://'));
  });

  // macOS standard menu so Cmd+Q, Cmd+W, copy/paste etc. work
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Focus Cycles',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { id: 'window-compact', label: 'Compact window', accelerator: 'CommandOrControl+Shift+M', enabled: false, click: () => setCompact(true) },
        { label: 'Show full window', click: showFullWindow },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        { label: 'Focus Cycles Support', click: () => openLocalHelp('support') },
        { label: 'Privacy Policy', click: () => openLocalHelp('privacy') }
      ]
    }
  ]));

  createTray();
  createWindow();
  app.on('activate', showFullWindow);
});

app.on('before-quit', () => { quitting = true; });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
