// module
const { app, BrowserWindow } = require('electron');
const path = require('path');

// window
function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 800,
        minHeight: 600,
        title: 'LifeMirror 2050: Mirror Your Life, Predict Your Health',
        icon: path.join(__dirname, 'icon.ico'),
        autoHideMenuBar: true,
        backgroundColor: '#0a0e1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}

// open main window
app.whenReady().then(createWindow);

// close window once completed
app.on('window-all-closed', () => {
    app.quit();
});

// recreate window
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});