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
let starredItemsFilePath;
let folderInfoList = []; // 全局变量
// 获取应用程序的目录路径
ipcRenderer.invoke('get-app-directory').then((result) => {
    starredItemsFilePath = result;
    // 你可以在这里初始化读取 JSON 文件，或者执行其他需要使用这个路径的操作
    //initializeStarredItems();
}).catch((error) => {
    console.error('Failed to get app directory:', error);
});
listaudio.src = 'sources/sound/listaudio.mp3';
scrollaudio.src = 'sources/sound/bar.mp3';
Cutaudio.src = 'sources/sound/quick.wav';
CutaudioOff.src = 'sources/sound/quick_off.wav';
document.addEventListener('DOMContentLoaded', () => {
    console.log('I\'m lain.');
    console.log("Music directory:", musicDir);
    const listElement = document.querySelector('.list');
    const centerLine2 = document.querySelector('.center-line2'); // 滚动条控件或需要处理透明度的控件

    // 监听滚动事件并改变透明度
    listElement.addEventListener('scroll', () => {
        centerLine2.style.opacity = 0; // 开始滚动时隐藏控件
        clearTimeout(listElement.hideScrollbarTimeout); // 清除之前的隐藏定时器

        // 在停止滚动 200ms 后恢复透明度
        listElement.hideScrollbarTimeout = setTimeout(() => {
            centerLine2.style.opacity = 1; // 停止滚动后恢复控件透明度
        }, 200);  
    });
    // 读取音乐目录
    fs.readdir(musicDir, (err, folders) => {
        if (err) {
            console.error('读取目录出错:', err);
            return;
        }

        console.log("Folders found:", folders);

        if (folders.length === 0) {
            console.log("No folders found.");
            return;
        }

        // 清空 folderInfoList，防止多次加载时重复数据
        folderInfoList = [];

        // 过滤掉系统文件
        folders = folders.filter(folder => folder !== '.DS_Store');

        // 遍历文件夹并读取每个音乐文件夹下的 JSON 文件
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
                    // 解析 JSON 文件并提取数据
                    const jsonData = JSON.parse(data);
                    const musicName = jsonData.music || folder;
                    const musicLevel = jsonData.level !== undefined ? jsonData.level : 5;
                    const musicNumber = jsonData.number || '#0';

                    folderInfoList.push({
                        folder,
                        musicName,
                        musicLevel,
                        musicNumber,
                        iconFilePath,
                        defaultIconPath
                    });

                    // 当所有文件夹处理完成后，调用更新列表的函数
                    if (folderInfoList.length === folders.length) {
                        updateListOrder(folderInfoList); // 确保在所有信息读取完后再调用排序函数
                    }
                } catch (error) {
                    console.error(`解析 ${jsonFilePath} 出错:`, error);
                }
            });
        });
    });
});
function getStarredItems() {
    if (fs.existsSync(starredItemsFilePath)) {
        try {
            const data = fs.readFileSync(starredItemsFilePath, 'utf-8');
            return JSON.parse(data) || [];
        } catch (error) {
            console.error('Error reading starredItems.json:', error);
            return [];
        }
    }
    return [];
}
// 保存被 Star 的项
function saveStarredItems(starredItems) {
    fs.writeFileSync(starredItemsFilePath, JSON.stringify(starredItems, null, 2), 'utf-8');
}
function backSwitch(iconFilePath, defaultIconPath) {
    // 检查文件是否存在
    fs.access(iconFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            iconFilePath = defaultIconPath; // 如果文件不存在，使用默认图标路径
        }

        const back = document.getElementById('back');

        // 开始淡出
        back.style.opacity = 0;

        // 使用短暂延迟以确保过渡生效
        setTimeout(() => {
            // 更改背景图像
            back.style.backgroundImage = `url(${iconFilePath})`;

            // 恢复透明度，淡入新背景图像
            setTimeout(() => {
                back.style.transition = 'none'; // 暂时禁用过渡效果
                back.offsetHeight; // 强制浏览器重新计算布局
                back.style.transition = 'opacity 0.1s ease-in-out'; // 重新启用过渡效果

                back.style.opacity = 1; // 开始淡入
            }, 50); // 50ms 延迟以确保淡入效果
        }, 100); // 500ms 延迟以确保淡出效果与CSS过渡时间一致
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

    // 检查是否当前的 musicNumber 已被 Star
    const isStarred = getStarredItems().includes(musicNumber);

    // 为 star-button 添加选中状态的类
    const starButtonClass = isStarred ? 'starred' : ''; // 如果已被 Star，添加 'starred' 类
    details.innerHTML = `
        <div id="titleid">${musicName}</div>
        <div id="songid">${musicNumber}</div>
        <div>Lv.${musicLevel}</div>
        <div id="star-button" class="${starButtonClass}"></div> <!-- Star 按钮的 class -->
    `;

    listItem.appendChild(img);
    listItem.appendChild(details);

    const list = document.querySelector('.list');
    list.appendChild(listItem);

    // 点击列表项选择音乐
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

    // 双击选择音乐
    listItem.addEventListener('dblclick', () => {
        selectFolder(folder, iconFilePath, defaultIconPath);
        ipcRenderer.send('folder-selected', { musicPath: startMusicPath, jsonFilePath: startJsonPath, iconFilePath: startMusicIcon });
        // 移除所有其他列表项的选中状态
        document.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
        // 为当前选中的列表项添加选中状态
        listItem.classList.add('selected');
    });

    // 处理 star-button 点击事件，更新 Star 状态并重新排序
    listItem.querySelector('#star-button').addEventListener('click', (event) => {
        event.stopPropagation(); // 阻止点击传播到父元素
        updateStarStatus(musicNumber); // 更新 Star 状态
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
function updateStarStatus(number) {
    let starredItems = getStarredItems(); // 获取当前被 Star 的项
    const index = starredItems.indexOf(number);

    if (index === -1) {
        // 不在列表中，添加
        starredItems.push(number);
    } else {
        // 已在列表中，移除
        starredItems.splice(index, 1); // 从被 Star 的列表中移除
    }

    saveStarredItems(starredItems); // 保存更新后的 Star 状态
    //console.log('Updated starred items and folderInfoList:', starredItems,folderInfoList); // 打印更新后的 Star 列表

    // 使用全局的 folderInfoList 重新排序
    updateListOrder(folderInfoList);
}
// 在读取完所有文件夹后，生成列表项并排序
function updateListOrder(folderInfoList) {
    const list = document.querySelector('.list');
    list.innerHTML = ''; // 清空列表

    const starredItems = getStarredItems(); // 获取被 Star 的项

    // 对列表进行排序
    folderInfoList.sort((a, b) => {
        const aStarred = starredItems.includes(a.musicNumber);
        const bStarred = starredItems.includes(b.musicNumber);

        // 被 Star 的项排在前面，按 musicNumber 排序
        if (aStarred && !bStarred) return -1;
        if (!aStarred && bStarred) return 1;
        
        // 如果都没有 Star 或者都已 Star，按 musicNumber 排序
        return a.musicNumber.localeCompare(b.musicNumber);
    });

    // 重新生成列表项并默认选择第一个
    folderInfoList.forEach((info, i) => {
        createListItem(info.folder, info.musicName, info.musicLevel, info.musicNumber, info.iconFilePath, info.defaultIconPath);

        // 默认选择第一个项目
        if (i === 0) {
            const listItem = document.querySelector('.list-item');
            listItem.classList.add('selected');  // 为第一个项目添加选中状态
            selectFolder(info.folder, info.iconFilePath, info.defaultIconPath);  // 更新右侧视图
        }
    });
}
document.addEventListener('click', (event) => {
    if (event.target.id === 'star-button' || event.target.closest('#star-button')) {
        const listItem = event.target.closest('.list-item');
        const number = listItem.querySelector('#songid').textContent; // 获取当前的number

        updateStarStatus(number); // 更新 Star 状态并重新排序
    }
});
// 监听右边图片的点击事件
document.getElementById('triangle-play').addEventListener('click', () => {
    console.log('folder-selected:', startMusicPath, startJsonPath, startMusicIcon);
    ipcRenderer.send('folder-selected', { musicPath: startMusicPath, jsonFilePath: startJsonPath, iconFilePath: startMusicIcon });
});