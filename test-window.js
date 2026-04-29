const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'NZBarr Test Window'
  });
  
  win.loadURL('data:text/html,<h1 style="text-align:center;margin-top:100px;color:green;font-family:sans-serif;">NZBarr is working!</h1><p style="text-align:center;font-family:sans-serif;">If you see this, the app is running correctly.</p>');
  
  console.log('Test window created');
  
  // Keep app alive
  setInterval(() => console.log('App still running'), 5000);
});
