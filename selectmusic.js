const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const originalLog = console.log;
const musicDir = path.join(__dirname, 'musics');
let startMusicPath;
let startJsonPath;
let startMusicIcon;
let audio = new Audio();
let Cutaudio = new Audio();
let CutaudioOff = new Audio();
let listaudio = new Audio();
let scrollaudio = new Audio();
listaudio.src = 'sources/sound/listaudio.mp3';
scrollaudio.src = 'sources/sound/bar.mp3';
Cutaudio.src = 'sources/sound/quick.wav';
CutaudioOff.src = 'sources/sound/quick_off.wav';
document.addEventListener('DOMContentLoaded', () => {
    console.log('I\'m lain.');
    console.log("Music directory:", musicDir);
    const paperLeft = document.getElementById('paperLeft');
    const paperRight = document.getElementById('paperRight');
    paperLeft.addEventListener('mouseover', () => {
        Cutaudio.play();
    });
    paperRight.addEventListener('mouseover', () => {
        Cutaudio.play();
    });
    paperLeft.addEventListener('mouseout', () => {
        CutaudioOff.play();
    });
    paperRight.addEventListener('mouseout', () => {
        CutaudioOff.play();
    });
    fs.readdir(musicDir, (err, folders) => {
        console.log("Folders found:", folders);

        if (folders.length === 0) {
            console.log("No folders found.");
        }

        if (err) {
            console.error('读取目录出错:', err);
            return;
        }

        const folderList = document.getElementById('folderList');
        folders = folders.filter(folder => folder !== '.DS_Store');

        // 用于存储所有文件夹信息的数组
        const folderInfoList = [];

        folders.forEach((folder, index) => {
            const jsonFilePath = path.join(musicDir, folder, `${folder}.json`);
            const iconFilePath = path.join(musicDir, folder, 'icon.png');
            const defaultIconPath = path.join(__dirname, 'sources/images/icon.png');

            fs.readFile(jsonFilePath, 'utf-8', (err, data) => {
                if (err) {
                    console.error(`读取 ${jsonFilePath} 出错:`, err);
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);
                    const musicName = typeof jsonData.music === 'string' ? jsonData.music : folder;
                    const musicLevel = jsonData.level !== undefined ? jsonData.level : 5;
                    const musicNumber = jsonData.number !== undefined ? jsonData.number : '#0';

                    folderInfoList.push({
                        folder,
                        musicName,
                        musicLevel,
                        musicNumber,
                        iconFilePath,
                        defaultIconPath
                    });

                    if (folderInfoList.length === folders.length) {
                        folderInfoList.sort((a, b) => a.musicNumber.localeCompare(b.musicNumber));

                        folderInfoList.forEach((info, i) => {
                            createListItem(info.folder, info.musicName, info.musicLevel, info.musicNumber, info.iconFilePath, info.defaultIconPath);

                            // 自动选择第一个文件夹
                            if (i === 0) {
                                const listItem = document.querySelector('.list-item');
                                listItem.classList.add('selected');
                                selectFolder(info.folder, info.iconFilePath, info.defaultIconPath);
                            }
                        });
                    }
                } catch (error) {
                    console.error(`解析 ${jsonFilePath} 出错:`, error);
                    // 同样的处理，保证列表项继续添加，即使JSON解析失败
                    const musicName = folder;
                    const musicLevel = 5;
                    const musicNumber = '#0';

                    folderInfoList.push({
                        folder,
                        musicName,
                        musicLevel,
                        musicNumber,
                        iconFilePath,
                        defaultIconPath
                    });

                    if (folderInfoList.length === folders.length) {
                        folderInfoList.sort((a, b) => a.musicNumber.localeCompare(b.musicNumber));

                        folderInfoList.forEach((info, i) => {
                            createListItem(info.folder, info.musicName, info.musicLevel, info.musicNumber, info.iconFilePath, info.defaultIconPath);
                            if (i === 0) {
                                const listItem = document.querySelector('.list-item');
                                listItem.classList.add('selected');
                                selectFolder(info.folder, info.iconFilePath, info.defaultIconPath);
                            }
                        });
                    }
                }
            });
        });
    });
});
function backSwitch(iconFilePath, defaultIconPath) {
    fs.access(iconFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            iconFilePath = defaultIconPath; // 如果文件不存在，使用默认图标路径
        }
        const back = document.getElementById('back');
        back.style.backgroundImage = `url(${iconFilePath})`;
    });
}
console.log = function (...args) {
    ipcRenderer.send('log-message', args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
    originalLog.apply(console, args);
};
function getScoreData(number) {
    return new Promise((resolve, reject) => {
        ipcRenderer.send('get-score', number);

        ipcRenderer.once('get-score-reply', (event, response) => {
            if (response.success) {
                resolve(response.data);
            } else {
                reject(response.error);
            }
        });
    });
}
function createListItem(folder, musicName, musicLevel, musicNumber, iconFilePath, defaultIconPath) {
    const listItem = document.createElement('div');
    listItem.classList.add('list-item');
    const img = document.createElement('img');
    fs.access(iconFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            iconFilePath = defaultIconPath; // 如果文件不存在，使用默认图标路径
        }
        img.src = iconFilePath;
        img.alt = musicName;
    });
    backSwitch(iconFilePath, defaultIconPath);
    const details = document.createElement('div');
    details.classList.add('details');
    details.innerHTML = `
        <div id="titleid">${musicName}</div>
        <div id="songid">${musicNumber}</div>
        <div>Lv.${musicLevel}</div>
    `;

    listItem.appendChild(img);
    listItem.appendChild(details);

    const list = document.querySelector('.list');
    list.appendChild(listItem);
    listItem.addEventListener('click', () => {
        selectFolder(folder, iconFilePath, defaultIconPath);
        // 移除所有其他列表项的选中状态
        document.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
        listaudio.play();
        // 为当前选中的列表项添加选中状态
        listItem.classList.add('selected');
    });
    listItem.addEventListener('wheel', () => {
        scrollaudio.play();
    });
    // 添加双击事件
    listItem.addEventListener('dblclick', () => {
        selectFolder(folder, iconFilePath, defaultIconPath);
        ipcRenderer.send('folder-selected', { musicPath: startMusicPath, jsonFilePath: startJsonPath, iconFilePath: startMusicIcon });
        // 移除所有其他列表项的选中状态
        document.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));

        // 为当前选中的列表项添加选中状态
        listItem.classList.add('selected');
    });
}
function selectFolder(folder, iconFilePath, defaultIconPath) {
    const musicPath = path.join(musicDir, folder, `${folder}.mp4`);
    const jsonFilePath = path.join(musicDir, folder, `${folder}.json`);
    backSwitch(iconFilePath, defaultIconPath);
    audio.loop = true;
    audio.src = musicPath; // 设置音频路径
    audio.play();

    fs.access(iconFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            iconFilePath = defaultIconPath; // 如果没有找到 icon.png，使用默认图标路径
        }

        // 更新右边的图片和简介
        const viewmain = document.getElementById('viewmain');
        const scorea = document.getElementById('scorea');
        const songtitlea = document.getElementById('songtitlea');

        viewmain.src = iconFilePath;
        startMusicPath = musicPath;
        startJsonPath = jsonFilePath;
        startMusicIcon = iconFilePath;

        // 读取JSON文件并更新简介信息
        fs.readFile(jsonFilePath, 'utf-8', async (err, data) => {
            if (err) {
                console.error(`读取 ${jsonFilePath} 出错:`, err);
                return;
            }

            try {
                const jsonData = JSON.parse(data);
                const Number = jsonData.number || '#0';
                let bestScore = jsonData.bestScore || '0';
                const musicName = jsonData.music || folder;

                // 获取全局的分数数据
                try {
                    const scoreData = await getScoreData(Number);
                    if (scoreData.number === Number) {
                        bestScore = scoreData.score; // 如果number匹配，则使用获取到的分数
                    }
                } catch (error) {
                    console.error('Failed to retrieve score data:', error);
                }

                scorea.innerHTML = `<span class="score2">Best Score </span><br>${bestScore}`;
                //songtitlea.querySelector('.score4').textContent = musicName;
                //applyScrollAnimation();

                // 重新初始化滚动动画
                initializeScrollAnimation(musicName);

            } catch (error) {
                console.error(`解析 ${jsonFilePath} 出错:`, error);
            }
        });
    });
}
// 监听右边图片的点击事件
document.getElementById('right-center').addEventListener('click', () => {
    console.log('folder-selected:', startMusicPath, startJsonPath, startMusicIcon);
    ipcRenderer.send('folder-selected', { musicPath: startMusicPath, jsonFilePath: startJsonPath, iconFilePath: startMusicIcon });
});