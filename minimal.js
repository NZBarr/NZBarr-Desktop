const { app, BrowserWindow } = require('electron');

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>NZBarr Test</h1><p>App is running</p>');
  win.webContents.openDevTools({ mode: 'detach' });
  
  console.log('Window created');
  
  win.on('closed', () => {
    console.log('Window closed event fired');
    win = null;
    console.log('Windows remaining:', BrowserWindow.getAllWindows().length);
  });
});

app.on('window-all-closed', (e) => {
  console.log('All windows closed (prevented quit on macOS)');
  e.preventDefault();
});

app.on('will-quit', (e) => {
  console.log('QUIT ATTEMPT DETECTED - preventing');
  e.preventDefault();
});

// Keep alive
setInterval(() => {
  console.log('Heartbeat - app still running');
}, 3000);
