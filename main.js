const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { shell } = require('electron');

let userSelectedFolder = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'renderer', 'assets', 'icon-32x32.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,  
      contextIsolation: true,  
    },
  });

  win.loadFile('renderer/index.html');
  win.setMenu(null);
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);
}

ipcMain.handle('open-file', (event, filePath) => {
  if (!userSelectedFolder) return;  

  if (!isPathInsideFolder(filePath, userSelectedFolder) && filePath !== userSelectedFolder) {
    console.warn(`Open file request outside selected folder denied: ${filePath}`);
    return;
  }

  return shell.openPath(filePath);
});
  

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('open-file-location', async (event, filePath) => {
  if (!userSelectedFolder) return;

  if (!isPathInsideFolder(filePath, userSelectedFolder) && filePath !== userSelectedFolder) {
    console.warn(`Open file location outside selected folder denied: ${filePath}`);
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    }
  } catch (err) {
    console.error('Failed to open file location:', err);
  }
});

  
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) return null;
  userSelectedFolder = result.filePaths[0];
  return userSelectedFolder;
});

const MAX_SIZE = 5 * 1024 * 1024; 

const isPathInsideFolder = (filePath, folderPath) => {
  try {
    const realFilePath = fs.realpathSync(filePath);
    const realFolderPath = fs.realpathSync(folderPath);
    const relative = path.relative(realFolderPath, realFilePath);
    return (
      relative === '' ||
      (!relative.startsWith('..') && !path.isAbsolute(relative))
    );
  } catch {
    return false; 
  }
};


ipcMain.handle('scan-folder', async (event, folderPath) => {
    if (!userSelectedFolder) return []; 

  if (!isPathInsideFolder(folderPath, userSelectedFolder) && folderPath !== userSelectedFolder) {
    console.warn(`Scan request outside selected folder denied: ${folderPath}`);
    return []; 
  }

    const files = [];
    let items = [];
    try {
      items = fs.readdirSync(folderPath);
    } catch (err) {
      console.error('Failed to read folder:', err);
      return [];
    }
      
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
  
      if (stat.isFile()) {
        let content = '';
        if (stat.size < MAX_SIZE) {
            try {
                content = fs.readFileSync(fullPath, 'utf-8');
              } catch (e) {
                content = '[Non-text or unreadable file]';
              }      
        } else {
            
        }

        files.push({
            name: item,
            path: fullPath,
            content,
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        }
    }
    
    return files;
  });
  

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
