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
let staraudio = new Audio();
let starredItemsFilePath;
let folderInfoList = []; // 全局变量
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
// 计算窗口宽高比
const windowAspectRatio = windowWidth / windowHeight;
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
Cutaudio.volume = 0.5;
CutaudioOff.volume = 0.5;
CutaudioOff.src = 'sources/sound/quick_off.wav';
staraudio.src = 'sources/sound/star.mp3';
document.addEventListener('DOMContentLoaded', () => {
    console.log('I\'m lain.');
    console.log("Music directory:", musicDir);
    WhiteCenter();
    const listElement = document.querySelector('.list');
    const centerLine2 = document.querySelector('.center-line2'); // 滚动条控件或需要处理透明度的控件
    animateColorChange();
    // 监听滚动事件并改变透明度
    listElement.addEventListener('scroll', () => {
        centerLine2.style.opacity = 0; // 开始滚动时隐藏控件
        clearTimeout(listElement.hideScrollbarTimeout); // 清除之前的隐藏定时器

        // 在停止滚动 200ms 后恢复透明度
        listElement.hideScrollbarTimeout = setTimeout(() => {
            centerLine2.style.opacity = 1; // 停止滚动后恢复控件透明度
        }, 200);
    });
    // 监听 paperLeft 和 paperRight 元素的鼠标悬停和移出事件
    const paperLeft = document.getElementById('paperLeft');
    const paperRight = document.getElementById('paperRight');
    paperLeft.addEventListener('mouseover', () => {
        Cutaudio.play(); // 鼠标悬停时播放音效
    });

    paperRight.addEventListener('mouseover', () => {
        Cutaudio.play(); // 鼠标悬停时播放音效
    });

    paperLeft.addEventListener('mouseout', () => {
        CutaudioOff.play(); // 鼠标移出时播放音效
    });

    paperRight.addEventListener('mouseout', () => {
        CutaudioOff.play(); // 鼠标移出时播放音效
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
function animateColorChange() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const textElement = document.getElementById('percentageA2');
    const fps = 60;  // 设置帧率为 60FPS
    let lastTime = 0;
    const interval = 1000 / fps;  // 每帧的间隔时间，单位为毫秒
    let isPaused = false;  // 控制动画是否暂停

    // 创建形状对象
    function createShape(x, y, size, color) {
        return {
            x: x,
            y: y,
            size: size,  // 使用 size 作为圆的直径
            color: color,
            speedX: Math.random() * 4 - 2,  // 减小速度范围以平滑运动
            speedY: Math.random() * 4 - 2,  // 减小速度范围
        };
    }

    // 创建多个圆形
    let shapes = [
        createShape(350, 250, 300, '#FF1493'),
        createShape(400, 100, 350, '#FFD700'),
        createShape(150, 150, 350, '#00FF7F'),
        createShape(300, 250, 300, '#1E90FF')
    ];

    // 绘制圆形的函数
    function drawShape(shape) {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);  // 圆形
        ctx.fillStyle = shape.color;
        ctx.fill();
        ctx.closePath();
    }

    // 更新形状状态（位置）
    function updateShape(shape, deltaTime) {
        shape.x += shape.speedX * (deltaTime / 16.67);  // 16.67ms 为标准帧间隔
        shape.y += shape.speedY * (deltaTime / 16.67);

        // 边界碰撞检测，防止圆跑出 Canvas 区域
        if (shape.x + shape.size / 2 > canvas.width || shape.x - shape.size / 2 < 0) shape.speedX *= -1;
        if (shape.y + shape.size / 2 > canvas.height || shape.y - shape.size / 2 < 0) shape.speedY *= -1;
    }

    // 动画帧函数，控制每秒 60 帧，并基于时间差插值运动
    function animate(time) {
        if (!isPaused) {  // 如果没有暂停
            const deltaTime = time - lastTime;
            if (deltaTime >= interval) {
                lastTime = time;

                ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清空画布
                shapes.forEach(shape => {
                    updateShape(shape, deltaTime);
                    drawShape(shape);
                });

                // 将 Canvas 渲染的内容作为背景图
                textElement.style.backgroundImage = `url(${canvas.toDataURL()})`;
            }
        }
        requestAnimationFrame(animate);
    }

    // 启动动画
    requestAnimationFrame(animate);

    // 监听窗口最小化和恢复
    window.addEventListener('blur', () => {
        isPaused = true;  // 当窗口失去焦点时暂停动画
    });

    window.addEventListener('focus', () => {
        isPaused = false;  // 当窗口恢复焦点时继续动画
        lastTime = performance.now();  // 重置 lastTime，避免时间跳跃
    });
}
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
    //console.log('iconFilePath:',iconFilePath);
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
        staraudio.play();
        lastSelectedNumber = musicNumber;
        // 通过 IPC 通知主进程更新 last-music.json 文件
        ipcRenderer.send('update-last-selected-number', { number: lastSelectedNumber });
        // 为当前选中的列表项添加选中状态
        listItem.classList.add('selected');
        backSwitch(iconFilePath, defaultIconPath);
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
        staraudio.play();
        event.stopPropagation(); // 阻止点击传播到父元素
        updateStarStatus(musicNumber); // 更新 Star 状态
        // 设置 lastSelectedNumber 为当前项的 number
        lastSelectedNumber = musicNumber;
        backSwitch(iconFilePath, defaultIconPath);
        // 通过 IPC 通知主进程更新 last-music.json 文件
        ipcRenderer.send('update-last-selected-number', { number: lastSelectedNumber });
    });
}
function WhiteCenter() {
    console.log('WhiteCenter');
    // 获取 .list 和 .center-line 元素
    const listElement = document.querySelector('.list');
    const centerLineElement = document.querySelector('.center-line');
    const centerLineElement2 = document.querySelector('.center-line2');

    // 获取 .list 的边界信息
    const listRect = listElement.getBoundingClientRect();
    const listRightX = listRect.right; // 获取 .list 元素的右侧坐标

    // 计算滚动条宽度（calc(0.4vw + 0.8vh)）
    const scrollbarWidth = window.innerWidth * 0.004 + window.innerHeight * 0.008; // 0.4vw + 0.8vh

    // 计算滚动条的中心 X 坐标
    const scrollbarCenterX = listRightX - scrollbarWidth / 2;

    // 获取 .center-line 的宽度
    const centerLineWidth = window.innerHeight * 0.03; // 3vh

    // 计算 .center-line 的中心 X 坐标，使其与滚动条的中心对齐
    const centerLineX = scrollbarCenterX - centerLineWidth / 2;

    // 设置 .center-line 的位置
    centerLineElement.style.position = 'absolute'; // 确保 .center-line 是绝对定位
    centerLineElement.style.left = `${centerLineX}px`;
    centerLineElement2.style.left = `${centerLineX}px`;
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
        const percentageA = document.getElementById('percentageA');
        const percentageA2 = document.getElementById('percentageA2');
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
                let bestpercentage = jsonData.bestpercentage !== undefined ? jsonData.bestpercentage : '0';
                const musicName = jsonData.music || folder;

                // 获取全局的分数数据
                try {
                    const scoreData = await getScoreData(Number);
                    if (scoreData.number === Number) {
                        bestScore = scoreData.score; // 如果number匹配，则使用获取到的分数
                        bestpercentage = scoreData.percentage !== undefined ? scoreData.percentage : '0';//如果number匹配，则使用获取到的百分比
                    }
                } catch (error) {
                    console.error('Failed to retrieve score data:', error);
                }

                scorea.innerHTML = `<span class="score2">Best Score </span><br>${bestScore}`;
                percentageA.innerHTML = `${bestpercentage}%`;
                percentageA2.innerHTML = `${bestpercentage}%`;
                // 获取 .score2 元素的边界并设置 percentageA 的位置
                const score2Element = document.querySelector('.score2');
                const score2Rect = score2Element.getBoundingClientRect();
                const score2RightX = score2Rect.right;
                const score2TopY = score2Rect.top;
                const score2LeftX = score2Rect.left;
                const score2BottomY = score2Rect.bottom;

                // 获取窗口的宽度和高度

                // 设置初始的 percentageA 和 percentageA2 位置
                percentageA.style.left = `calc(${score2RightX}px + 1vh)`;
                percentageA.style.top = `${score2TopY}px`;
                percentageA2.style.left = `calc(${score2RightX}px + 1vh)`;
                percentageA2.style.top = `${score2TopY}px`;
                // 如果窗口宽高比接近 4:3，则使用条件方案调整位置
                // 4:3 的宽高比大约为 1.33，可以定义一个范围（例如 1.25 到 1.35 之间）
                if (windowAspectRatio > 1.25 && windowAspectRatio < 1.45) {
                    // 如果超出了窗口宽度，设置 percentageA 和 percentageA2 的位置
                    percentageA.style.left = `${score2LeftX}px`;
                    percentageA.style.top = `calc(${score2BottomY}px + 4vh)`;

                    percentageA2.style.left = `${score2LeftX}px`;
                    percentageA2.style.top = `calc(${score2BottomY}px + 4vh)`;
                } else {
                    // 处理其他宽高比的情况（比如 16:9 或更宽的窗口）
                    const percentageARect = percentageA.getBoundingClientRect();

                    // 如果超出窗口宽度，也需要调整位置
                    if (percentageARect.right > windowWidth) {
                        percentageA.style.left = `${score2LeftX}px`;
                        percentageA.style.top = `calc(${score2BottomY}px + 4vh)`;

                        percentageA2.style.left = `${score2LeftX}px`;
                        percentageA2.style.top = `calc(${score2BottomY}px + 4vh)`;
                    }
                }
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
function getLastMusicNumber() {
    return new Promise((resolve) => {
        ipcRenderer.once('get-last-music-number-reply', (event, { success, number }) => {
            if (success && number) {
                resolve(number);
            } else {
                resolve(null); // 如果没有持久化的 number，则返回 null
            }
        });

        ipcRenderer.send('get-last-music-number');
    });
}

async function updateListOrder(folderInfoList) {
    const list = document.querySelector('.list');
    list.innerHTML = ''; // 清空列表

    const starredItems = getStarredItems(); // 获取被 Star 的项
    let lastSelectedNumber = await getLastMusicNumber(); // 等待获取持久化的 lastNumber

    //console.log('lastSelectedNumber:', lastSelectedNumber);

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
        //console.log('看看我有几个');
        createListItem(info.folder, info.musicName, info.musicLevel, info.musicNumber, info.iconFilePath, info.defaultIconPath);

        if (lastSelectedNumber && info.musicNumber === lastSelectedNumber) {
            // 选择持久化的 lastNumber 对应的项目
            const listItem = document.querySelector('.list-item:last-child');
            listItem.classList.add('selected');
            backSwitch(info.iconFilePath, info.defaultIconPath);
            selectFolder(info.folder, info.iconFilePath, info.defaultIconPath);
            // 滚动到该 list-item
            listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (i === 0 && !lastSelectedNumber) {
            // 如果没有持久化的 lastNumber，选择第一个项目
            const listItem = document.querySelector('.list-item:last-child');
            backSwitch(info.iconFilePath, info.defaultIconPath);
            listItem.classList.add('selected');
            selectFolder(info.folder, info.iconFilePath, info.defaultIconPath);
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