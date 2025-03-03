const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');
const { spawn } = require('child_process'); // 使用 spawn 而不是 exec

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: "static/img/logo.ico",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadFile('static/html/index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 监听渲染进程发送的 'execute-command' 事件
ipcMain.on('execute-command', (event) => {
  // 这里设置你要执行的 CLI 命令
  const command = 'ping'; // 例如：ping 命令
  const args = ['google.com']; // 命令参数

  // 使用 spawn 启动子进程
  const child = spawn(command, args);

  // 实时输出命令执行结果
  child.stdout.on('data', (data) => {
    event.reply('command-output', data.toString());
  });

  child.stderr.on('data', (data) => {
    event.reply('command-output', data.toString());
  });

  // 进程结束时发送通知
  child.on('close', (code) => {
    event.reply('command-output', `进程已结束，退出码：${code}`);
  });
});