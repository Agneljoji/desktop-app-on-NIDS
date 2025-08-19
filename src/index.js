import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

// --- Recreate __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ---

// --- Firebase Setup ---
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebaseConfig.js';

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
// --- End Firebase Setup ---

let pythonProcess = null;
let mainWindow = null;
let currentWindow = null;
let ws = null;

function createPythonProcess() {
  if (pythonProcess) return;

  let scriptPath;
  if (app.isPackaged) {
    scriptPath = path.join(process.resourcesPath, 'server.exe');
  } else {
    scriptPath = path.join(__dirname, '..', 'python_engine', 'dist', 'server.exe');
  }

  // Use the simple spawn command, as we are running from an admin terminal
  pythonProcess = spawn(scriptPath);
  pythonProcess.stdout.on('data', (data) => console.log(`Python stdout: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Python stderr: ${data}`));
}

function connectWebSocket() {
    if (ws) return;
    
    // Attempt to connect after a delay to allow the server to start
    setTimeout(() => {
        ws = new WebSocket('ws://127.0.0.1:8000/ws');

        ws.on('open', () => {
            console.log('Main process connected to Python WebSocket.');
            if (mainWindow) {
                mainWindow.webContents.send('packet-data', JSON.stringify({log: "[System] Monitoring started."}));
            }
        });

        ws.on('message', (data) => {
            if (mainWindow) {
                mainWindow.webContents.send('packet-data', data.toString());
            }
        });

        ws.on('close', () => {
            console.log('Disconnected from Python WebSocket.');
            ws = null;
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
            ws = null; // Reset ws so we can try again
            // If connection is refused, it means the server isn't ready. Retry.
            if (err.message.includes('ECONNREFUSED')) {
                if (mainWindow) {
                    mainWindow.webContents.send('packet-data', JSON.stringify({log: `[System] Connection refused. Retrying...`}));
                }
                setTimeout(connectWebSocket, 3000);
            }
        });
    }, 2500); // Increased delay for more reliability
}

function disconnectWebSocket() {
    if (ws) {
        ws.close();
    }
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));
  return mainWindow;
}

function createAuthWindow(filePath, width = 400, height = 550) {
    const win = new BrowserWindow({
        width,
        height,
        webPreferences: { preload: path.join(__dirname, 'preload.js') },
    });
    win.loadFile(path.join(__dirname, filePath));
    return win;
}

app.whenReady().then(() => {
  currentWindow = createAuthWindow('index.html');

  ipcMain.handle('signup', async (event, { email, password }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const safeUser = { uid: userCredential.user.uid, email: userCredential.user.email };
      return { success: true, user: safeUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('login', async (event, { email, password }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const safeUser = { uid: userCredential.user.uid, email: userCredential.user.email };
      return { success: true, user: safeUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('navigate', (event, page) => {
    if (currentWindow) {
        currentWindow.close();
    }
    if (page === 'dashboard.html') {
        currentWindow = createMainWindow();
    } else {
        currentWindow = createAuthWindow(page);
    }
  });

  ipcMain.on('start-monitoring', () => {
      createPythonProcess();
      connectWebSocket();
  });

  ipcMain.on('stop-monitoring', () => {
      disconnectWebSocket();
  });
});

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
