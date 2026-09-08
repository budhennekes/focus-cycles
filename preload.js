const { contextBridge, ipcRenderer } = require('electron');

// Bounded window controls and structured timer status; no general-purpose IPC.
contextBridge.exposeInMainWorld('focusBridge', {
  setWindowStatus: (status) => ipcRenderer.send('window-status', status),
  onCompactAvailability: (cb) => ipcRenderer.on('compact-availability', (_e, available) => { if (typeof available === 'boolean') cb(available); }),
  onCompactState: (cb) => {
    ipcRenderer.on('compact-state', (_e, on) => { if (typeof on === 'boolean') cb(on); });
    ipcRenderer.send('window-controls-ready');
  },
  setCompact: (on) => ipcRenderer.send('set-compact', !!on),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  dragEnd: () => ipcRenderer.send('drag-end'),
  saveHistoryCsv: (csv, suggestedName) => ipcRenderer.invoke('save-history-csv', csv, suggestedName),
  // The menu-bar (tray) menu sends pause/skip/stop back to the running session.
  onTrayAction: (cb) => ipcRenderer.on('tray-action', (_e, action) => cb(action)),
});
