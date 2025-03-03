const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  executeCommand: (command) => ipcRenderer.send('execute-command', command),
  onCommandOutput: (callback) => ipcRenderer.on('command-output', callback),
});