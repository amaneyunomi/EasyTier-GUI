const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// 日志文件路径
const logFilePath = path.join(__dirname, 'logs', 'easytier.log');

// 写入日志函数
function logToFile(message) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) console.error('日志写入失败:', err);
  });
}

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

  // 自动启动 EasyTier 服务并连接服务器
  startEasyTierService(mainWindow);
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
ipcMain.on('execute-command', (event, command) => {
  if (command === 'get-peers') {
    getPeers(event);
  }
});

// 启动 EasyTier 服务
function startEasyTierService(mainWindow) {
  const configPath = path.join(__dirname, 'etc', 'config.yaml');
  // 添加 --no-tun 参数以确保不使用 TUN 模式连接
  const easyTierProcess = spawn(path.join(__dirname, 'bin', 'easytier-core.exe'), ['-c', configPath, '--no-tun']);

  easyTierProcess.stdout.on('data', (data) => {
    const message = data.toString();
    console.log(`EasyTier 输出: ${message}`);
    mainWindow.webContents.send('connection-status', message);
    logToFile(`EasyTier 输出: ${message}`);
  });

  easyTierProcess.stderr.on('data', (data) => {
    const message = data.toString();
    console.error(`EasyTier 错误: ${message}`);
    mainWindow.webContents.send('connection-status', `服务启动失败: ${message}`);
    logToFile(`EasyTier 错误: ${message}`);
  });

  easyTierProcess.on('close', (code) => {
    const message = `EasyTier 服务已关闭，退出码：${code}`;
    console.log(message);
    mainWindow.webContents.send('connection-status', message);
    logToFile(message);
  });

  // 自动连接到指定服务器（支持 TCP 和 UDP）
  setTimeout(() => {
    const connectCommands = [
      'connect tcp://vpn.ycmt.top:10110', // TCP 连接
      'connect udp://vpn.ycmt.top:10110'   // UDP 连接
    ];

    connectCommands.forEach((command) => {
      // const connectProcess = spawn(path.join(__dirname, 'bin', 'easytier-cli.exe'), [command]);
      const args = command.split(' ');
      const connectProcess = spawn(path.join(__dirname, 'bin', 'easytier-cli.exe'), ['peer', 'connect', args[1]]);

      connectProcess.stdout.on('data', (data) => {
        const message = data.toString();
        console.log(`连接服务器输出 (${command}): ${message}`);
        mainWindow.webContents.send('connection-status', message);
        logToFile(`连接服务器输出 (${command}): ${message}`);
      });

      connectProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.error(`连接服务器错误 (${command}): ${message}`);
        mainWindow.webContents.send('connection-status', `连接服务器失败 (${command}): ${message}`);
        logToFile(`连接服务器错误 (${command}): ${message}`);
      });

      connectProcess.on('close', (code) => {
        const message = `连接服务器完成 (${command})，退出码：${code}`;
        console.log(message);
        mainWindow.webContents.send('connection-status', message);
        logToFile(message);
      });
    });
  }, 2000); // 延迟 2 秒后执行连接命令
}

// 获取节点信息
function getPeers(event) {
  const peerProcess = spawn(path.join(__dirname, 'bin', 'easytier-cli.exe'), ['peer']);

  peerProcess.stdout.on('data', (data) => {
    event.reply('peers-output', data.toString());
    logToFile(`节点信息: ${data.toString()}`);
  });

  peerProcess.stderr.on('data', (data) => {
    event.reply('peers-output', data.toString());
    logToFile(`获取节点信息失败: ${data.toString()}`);
  });

  peerProcess.on('close', (code) => {
    event.reply('peers-output', `获取节点信息完成，退出码：${code}`);
    logToFile(`获取节点信息完成，退出码：${code}`);
  });
}

// 定时更新节点信息
setInterval(() => {
  ipcMain.emit('execute-command', 'get-peers');
}, 5000); // 每5秒更新一次节点信息