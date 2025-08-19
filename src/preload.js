const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  signup: (credentials) => ipcRenderer.invoke('signup', credentials),
  navigate: (page) => ipcRenderer.send('navigate', page),
  
  // These now just send a simple message, the main process handles the logic
  startMonitoring: () => ipcRenderer.send('start-monitoring'),
  stopMonitoring: () => ipcRenderer.send('stop-monitoring'),
  
  // This listener now receives data forwarded from the main process
  onPacket: (callback) => ipcRenderer.on('packet-data', (_event, value) => callback(value))
});
