const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, shell, session } = require('electron');
const path = require('path');

app.setName('Focus Cycles');

// Compact "mini bar" — shrink the window in place to a small always-on-top
// strip (so it clearly reads as the same window getting smaller), and restore.
let savedBounds = null;
function isCompact() { return savedBounds !== null; }
function setCompact(on) {
  if (!mainWin) return;
  if (on) {
    if (savedBounds) return; // already compact
    savedBounds = mainWin.getBounds();
    const b = savedBounds;
    const w = 420, h = 88;
    // Anchor the bar near the window's current top edge so it shrinks in place
    const area = screen.getDisplayNearestPoint(b).workArea;
    const x = Math.min(Math.max(b.x, area.x), area.x + area.width - w);
    const y = Math.min(Math.max(b.y, area.y), area.y + area.height - h);
    mainWin.setBounds({ x, y, width: w, height: h }, true);
    mainWin.setMovable(true);
    // Float above normal windows, and stay visible across spaces and over
    // fullscreen apps — the standard for a floating mini widget.
    mainWin.setAlwaysOnTop(true, 'floating');
    mainWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWin.setOpacity(0.9); // gently translucent; solid on hover (see renderer)
  } else {
    mainWin.setAlwaysOnTop(false);
    mainWin.setVisibleOnAllWorkspaces(false);
    mainWin.setOpacity(1);
    if (savedBounds) { mainWin.setBounds(savedBounds, true); savedBounds = null; }
  }
}
ipcMain.on('set-compact', (_e, on) => setCompact(!!on));

// Hover-to-solidify: the mini bar sits slightly translucent so it stays out of
// the way, and goes fully opaque while the pointer is over it.
ipcMain.on('bar-opacity', (_e, v) => {
  if (mainWin && isCompact()) mainWin.setOpacity(Math.max(0.5, Math.min(1, Number(v) || 1)));
});

// Manual drag: the renderer captures the pointer and streams deltas from the
// position where the drag began. Moving from a fixed origin avoids drift.
let dragOrigin = null;
ipcMain.on('drag-start', () => { if (mainWin) dragOrigin = mainWin.getBounds(); });
ipcMain.on('drag-move', (_e, dx, dy) => {
  if (!mainWin || !dragOrigin) return;
  mainWin.setBounds({
    x: Math.round(dragOrigin.x + (Number(dx) || 0)),
    y: Math.round(dragOrigin.y + (Number(dy) || 0)),
    width: dragOrigin.width,
    height: dragOrigin.height
  });
});
ipcMain.on('drag-end', () => { dragOrigin = null; });

// Menu-bar countdown. The tray appears only while a session is running (the
// renderer sends the time each visible second, and an empty string to clear).
// The non-empty title also tells us a timer is active, which drives the
// "minimize turns into the mini bar" behavior below.
let tray = null;
let sessionRunning = false;
function setMenuBarTitle(text) {
  sessionRunning = !!text;
  if (text) {
    if (!tray) {
      tray = new Tray(nativeImage.createEmpty());
      tray.setToolTip('Focus Cycles');
      tray.on('click', () => { if (mainWin) { mainWin.show(); mainWin.focus(); } });
    }
    tray.setTitle(' ' + text);
  } else if (tray) {
    tray.destroy();
    tray = null;
  }
}
ipcMain.on('menubar-title', (_e, text) => setMenuBarTitle(text));

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
  "connect-src 'self' https://api.open-meteo.com https://ipwho.is https://ipapi.co",
  "font-src 'self' data:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // Focus-music streams run in an embedded YouTube player
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com"
].join('; ');

// The music stream starts from a hidden player; don't require a gesture inside the frame
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Two instances would race each other's localStorage writes — allow only one.
let mainWin = null;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 360,
    minHeight: 80,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWin = win;
  win.on('closed', () => { if (mainWin === win) mainWin = null; });

  // Make the yellow minimize button (and Cmd+M) do what people expect here:
  // during a session it turns the window into the mini bar instead of hiding
  // it in the Dock. The 'minimize' event isn't cancelable, so we bounce it
  // back out and shrink instead. With no active session it minimizes normally.
  win.on('minimize', () => {
    if (sessionRunning && !isCompact()) {
      win.restore();
      setCompact(true);
    }
  });

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
  // YouTube embeds refuse to play from file:// pages ("Error 153") because no
  // Referer header is sent. Identify ourselves so the music player works.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (/^https:\/\/([a-z0-9-]+\.)*(youtube(-nocookie)?\.com|googlevideo\.com|ytimg\.com)\//i.test(details.url)) {
      details.requestHeaders['Referer'] = 'https://focuscycles.app/';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Apply our CSP only to the app's own documents. Third-party frames
    // (the YouTube music player) must keep their own headers — stamping our
    // restrictive CSP on them blocks their scripts and the player never starts.
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
    const allowedPermissions = new Set(['geolocation', 'notifications']);
    callback(allowedPermissions.has(permission) && webContents.getURL().startsWith('file://'));
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
        { role: 'close' }
      ]
    }
  ]));

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
