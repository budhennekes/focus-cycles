const { contextBridge, ipcRenderer } = require('electron');

// Minimal, one-way bridge: the renderer can set the macOS menu-bar countdown.
contextBridge.exposeInMainWorld('focusBridge', {
  setMenuBarTitle: (text) => ipcRenderer.send('menubar-title', typeof text === 'string' ? text : ''),
  setCompact: (on) => ipcRenderer.send('set-compact', !!on),
  setBarOpacity: (v) => ipcRenderer.send('bar-opacity', v),
});
