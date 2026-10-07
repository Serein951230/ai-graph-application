const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snowwaveDesktop', {
  isDesktop: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
});
