const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
});
