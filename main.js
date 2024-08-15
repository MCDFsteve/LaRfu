// 修改 `main.js`
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
let musicPath = null;
let jsonFilePath = null;
let iconFilePath = null;
let mainWindow;
// 获取应用程序目录路径
const userDataPath = app.getPath('userData');
const filePath = path.join(userDataPath, 'paths.json');
const scoreFilePath = path.join(userDataPath, 'score.json');
ipcMain.on('save-score', (event, { score, number }) => {
    fs.readFile(scoreFilePath, 'utf-8', (err, data) => {
        let existingScores = [];

        if (err) {
            if (err.code !== 'ENOENT') {
                console.error('Failed to read existing score data:', err);
                return;
            }
        } else {
            try {
                existingScores = JSON.parse(data);

                // 如果 existingScores 不是数组，则将其初始化为数组
                if (!Array.isArray(existingScores)) {
                    console.error('Existing score data is not an array, initializing as an empty array.');
                    existingScores = [];
                }

            } catch (parseError) {
                console.error('Failed to parse existing score data, initializing as an empty array:', parseError);
                existingScores = [];
            }
        }

        // 查找是否已经存在相同 number 的分数
        let existingEntry = existingScores.find(entry => entry.number === number);

        if (existingEntry) {
            // 如果存在且新的分数不大于旧分数，退出
            if (score <= existingEntry.score) {
                console.log('New score is not higher than the existing score. No update made.');
                return;
            }

            // 更新已有的分数
            existingEntry.score = score;
        } else {
            // 如果不存在，添加新的分数
            existingScores.push({ score, number });
        }

        // 写入更新后的数据到 score.json 文件
        fs.writeFile(scoreFilePath, JSON.stringify(existingScores, null, 2), (err) => {
            if (err) {
                console.error('Failed to save score:', err);
            } else {
                console.log('Score saved successfully to', scoreFilePath);
            }
        });
    });
});
ipcMain.on('get-score', (event, number) => {
    fs.readFile(scoreFilePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Failed to read score data:', err);
            event.reply('get-score-reply', { success: false, error: 'Failed to read score data.' });
            return;
        }

        try {
            const existingScores = JSON.parse(data);
            const entry = existingScores.find(entry => entry.number === number);

            if (entry) {
                // 如果找到对应的分数，返回它
                event.reply('get-score-reply', { success: true, data: entry });
            } else {
                // 如果没有找到对应的分数，返回错误信息
                event.reply('get-score-reply', { success: false, error: 'Score not found for the specified number.' });
            }
        } catch (parseError) {
            console.error('Failed to parse score data:', parseError);
            event.reply('get-score-reply', { success: false, error: 'Failed to parse score data.' });
        }
    });
});
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

    // 写入文件前检查目录是否存在，如果不存在，则创建它
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    // 将数据写入到 paths.json 文件中
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
    console.log('JSON data written to', filePath);

    // 获取主窗口或创建一个新窗口
    let mainWindow = BrowserWindow.getAllWindows()[0] || mainWindow;

    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow(); // 创建新窗口
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

// 提供一个 IPC 通讯接口让渲染进程获取 paths.json 的路径
ipcMain.handle('get-paths-json-path', async () => {
    return filePath;
});

ipcMain.on('log-message', (event, message) => {
    console.log(message);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    //if (process.platform !== 'darwin') {
        app.quit();
    //}
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});