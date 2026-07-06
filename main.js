const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

app.setName('Focus Cycles');

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
    minHeight: 96,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWin = win;
  win.on('closed', () => { if (mainWin === win) mainWin = null; });
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
