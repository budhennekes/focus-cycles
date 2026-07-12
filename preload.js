const { contextBridge, ipcRenderer } = require('electron');

// Minimal, one-way bridge: the renderer can set the macOS menu-bar countdown.
contextBridge.exposeInMainWorld('focusBridge', {
  setMenuBarTitle: (text) => ipcRenderer.send('menubar-title', typeof text === 'string' ? text : ''),
  setCompact: (on) => ipcRenderer.send('set-compact', !!on),
  setBarOpacity: (v) => ipcRenderer.send('bar-opacity', v),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  dragEnd: () => ipcRenderer.send('drag-end'),
  // The menu-bar (tray) menu sends pause/skip/stop back to the running session.
  onTrayAction: (cb) => ipcRenderer.on('tray-action', (_e, action) => cb(action)),
});
