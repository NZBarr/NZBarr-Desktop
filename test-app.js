const { app, BrowserWindow } = require('electron');
console.log('app:', typeof app);
console.log('BrowserWindow:', typeof BrowserWindow);

if (!app) {
  console.error('FAILED: app is undefined');
  process.exit(1);
}

app.whenReady().then(() => {
  console.log('App is ready!');
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadFile('renderer/index.html');
  win.webContents.openDevTools();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
