const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const musicPath = './musics/20240617/20240617.mp4';
const originalLog = console.log; // 保存原始的console.log函数，以便还可以在渲染器中本地打印日志
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
let jsonFilePath; // Global variable to hold the path to the JSON file
let jsonData = { music: "", mode: { one: { groups: [] } } }; // Global jsonData
let keyPressTimes = {};
console.log = function (...args) {
    ipcRenderer.send('log-message', args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
    originalLog.apply(console, args); // 保持渲染进程的控制台也可以输出日志
};
document.addEventListener('keydown', function(event) {
    const action = getButtonAction(event.code);
    if (action) {
        if (!keyPressTimes[event.code]) {  // 如果当前没有记录按下时间
            keyPressTimes[event.code] = audioPlayer.currentTime;  // 记录按下时间
            // 触发对应的按钮视觉反应
            const button = action === 'left' ? leftButton : rightButton;
            button.classList.add('dim');
            setTimeout(() => button.classList.remove('dim'), 200);
        }
    }
});

document.addEventListener('keyup', function(event) {
    const action = getButtonAction(event.code);
    if (action && keyPressTimes[event.code]) {  // 如果有按下记录
        const startTime = keyPressTimes[event.code];
        const endTime = audioPlayer.currentTime;
        const duration = endTime - startTime;  // 计算按下持续时间
        if (duration >= 0.2) {  // 只有当按下时间大于200毫秒时才视为长按
            console.log(`Long press detected: Key='${event.code}', Action='${action}', Start='${startTime.toFixed(3)}', End='${endTime.toFixed(3)}', Duration='${duration.toFixed(3)}' seconds.`);
            addGroupToJSON(action === 'left' ? 'a' : 'b', startTime, endTime);
        }else{
            addGroupToJSON(action === 'left' ? 'a' : 'b', startTime);
        }
        delete keyPressTimes[event.code];  // 清除按下时间记录
    }
});
document.addEventListener('DOMContentLoaded', (event) => {
    document.body.addEventListener('click', (event) => {
        const windowWidth = window.innerWidth;
        const clickX = event.clientX; // 获取鼠标点击的X坐标

        if (clickX < windowWidth / 2) {
            // 如果点击在窗口的左半部分
            console.log("Simulating 'c' key press");
            // 这里可以插入模拟按下 'c' 键的代码
            triggerKeyPress('c');
        } else {
            // 如果点击在窗口的右半部分
            console.log("Simulating 'm' key press");
            // 这里可以插入模拟按下 'm' 键的代码
            triggerKeyPress('m');
        }
    });
    function triggerKeyPress(key) {
        // 创建一个新的键盘事件
        var event = new KeyboardEvent('keydown', { 'key': key });
        document.dispatchEvent(event);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const progressBar = document.getElementById('progressBar');
    const timeDisplay = document.getElementById('timeDisplay');
    const songTitle = document.getElementById('songTitle');

    audioPlayer.src = musicPath;
    songTitle.textContent = path.basename(musicPath, path.extname(musicPath));

    const downloadsFolder = path.join(os.homedir(), 'Downloads', 'LaRfu');
    jsonFilePath = path.join(downloadsFolder, `${songTitle.textContent}.json`);
    console.log("jsonFilePath:", jsonFilePath);
    if (!fs.existsSync(downloadsFolder)) {
        fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    if (fs.existsSync(jsonFilePath)) {
        jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    } else {
        jsonData.music = songTitle.textContent;
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 4));
    }
    console.log("jsonData:", jsonData);
    audioPlayer.oncanplaythrough = () => audioPlayer.play();
    audioPlayer.addEventListener('timeupdate', () => {
        progressBar.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        timeDisplay.textContent = formatTime(audioPlayer.currentTime);
    });
});
function formatTime(currentTime) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 1000);
    return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds, 3)}`;
}

function pad(number, digits = 2) {
    return number.toString().padStart(digits, '0');
}
function addGroupToJSON(rail, startTime, endTime = null) {
    const startTimeFormat = formatTime(startTime);
    let timeFormat = startTimeFormat;

    if (endTime != null) {
        const endTimeFormat = formatTime(endTime);
        timeFormat = `${startTimeFormat},${endTimeFormat}`;  // 用逗号分隔两个时间戳
    }

    const newGroup = {
        time: timeFormat,
        speed: 1,
        rail: rail,
        road: 1
    };

    console.log("Adding new group:", newGroup);
    jsonData.mode.one.groups.push(newGroup);
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 4));
}
function getButtonAction(code) {
    switch (code) {
        case 'KeyX':
        case 'KeyC':
        case 'KeyV':
            return 'left';
        case 'KeyM':
        case 'Comma':
        case 'Period':
        case 'IntlRo':
            return 'right';
        default:
            return null;
    }
}
