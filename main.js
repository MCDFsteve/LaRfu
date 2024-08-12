// 修改 `main.js`
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
let musicPath = null;
let jsonFilePath = null;
let iconFilePath = null;
let mainWindow;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        show: true, // 设置为不显示窗口
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 预加载 game.html 但不显示
    mainWindow.loadFile('./game.html').then(() => {
        if (musicPath && jsonFilePath && iconFilePath) {
            // 如果已经选择了音乐路径、JSON 文件路径和图标路径，则显示窗口
            mainWindow.show();
        } else {
            // 否则，加载选择界面并显示窗口
            mainWindow.loadFile('./selectmusic.html').then(() => {
                mainWindow.show();
            });
        }
    });

    // 监听窗口大小变化，发送新的尺寸到渲染进程
    mainWindow.on('resize', () => {
        const { width, height } = mainWindow.getSize();
        mainWindow.webContents.send('resize', { width, height });
    });
}

ipcMain.on('open-index-and-close-current', (event) => {
    const currentWindow = event.sender.getOwnerBrowserWindow();
    currentWindow.webContents.goBack();
});

ipcMain.on('folder-selected', (event, { musicPath, jsonFilePath, iconFilePath }) => {
    console.log('Music path:', musicPath);
    console.log('JSON file path:', jsonFilePath);
    console.log('Icon file path:', iconFilePath);
    const data = { musicPath, jsonFilePath, iconFilePath };
    const dirPath = path.join(os.homedir(), 'Downloads', 'LaRfu');
    const filePath = path.join(dirPath, 'paths.json');

    // 检查目录是否存在，如果不存在，则创建它
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
    console.log('JSON data written to', filePath);

    // 尝试获取当前的主窗口或新建一个
    let mainWindow = BrowserWindow.getAllWindows()[0] || mainWindow;

    // 如果当前没有任何窗口，先创建窗口
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow(); // 此函数调用后 mainWindow 应该被正确初始化
    }

    // 确保窗口加载完毕后发送数据，并切换到游戏界面
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('init-data', data); // 发送数据到渲染进程
    });

    // 加载游戏页面并在加载完毕后显示窗口
    mainWindow.loadFile('./game.html').then(() => {
        mainWindow.show();
    });
});

ipcMain.on('log-message', (event, message) => {
    console.log(message);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});