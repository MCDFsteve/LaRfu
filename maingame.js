const canvas = document.getElementById('webglCanvas');
const ctx = canvas.getContext('2d'); // 修改这里使用2D上下文
const newCanvas = document.getElementById('newCanvas');
const newCtx = newCanvas.getContext('2d');
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// 初始化时获取并设置 paths.json 的路径
let filePath;
const originalLog = console.log; // 保存原始的console.log函数，以便还可以在渲染器中本地打印日志
//const jsonFilePath2 = path.join('./codes/破碎的苹果.json'); // 确保路径正确
const audioPlayer = document.getElementById('audioPlayer');
// 定义全局 AudioContext
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const keyTimers = {};
const pressedKeys = new Set();
const leftKeys = new Set(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
const rightKeys = new Set(['KeyK', 'KeyL', 'Semicolon', 'Quote', 'KeyN', 'KeyM', 'Comma', 'Period', 'IntlRo', 'Slash']);
const keyManager = new KeyManager();
let musicTitle;
let number;
let buffer;
let bufferLong;
let longSoundSource = null;
let danmakuhit = true;
let fps = 0;
let totalScore = 0;  // 总分
let framesThisSecond = 0;
let lastFpsUpdate = 0;
let totalCircles = 0; // 总弹幕数
let hitCircles = 0; // 击中的弹幕数
let particles = []; // 用于存储粒子的数组
let scoreDisplay = null; // 用于显示分数的HTML元素
let consecutiveHits = 0; // 连续击中的弹幕数量
let longr = {
    left: false,
    right: false
};
let keyStates = {
    left: false,
    right: false
};
let percentage;
let circles = []; // 存储弹幕的数组
let jsonData; // 保存从 JSON 文件加载的数据
let countdownStarted = false;
let countdownStarted2 = false;
let isStartHita = true;
let isStartHitb = true;
let isNext = true;
var isPlaying = true;
var keyInputsEnabled = true;
var clickInputsEnabled = true;
var button = document.getElementById('playPauseButton');
var overlay = document.getElementById('overlay'); // 获取遮罩层元素
var pauseIcon = button.querySelector('.pause-icon');
var playIcon = button.querySelector('.play-icon');

console.log = function (...args) {
    ipcRenderer.send('log-message', args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
    originalLog.apply(console, args); // 保持渲染进程的控制台也可以输出日志
};
// 初始化 canvas 大小
resizeCanvas();
resizeNewCanvas();
requestAnimationFrame(function init(timestamp) {
    lastFpsUpdate = timestamp; // 初始化时间
    framesThisSecond = 0;
    animate(timestamp);
});
// 在适当的地方开始动画循环
requestAnimationFrame(animate);
// 监听窗口大小变化事件
window.addEventListener('resize', resizeCanvas);
window.addEventListener('resize', resizeNewCanvas);
yanchia = document.getElementById('yanchi');
yanchia.style.position = 'absolute';
yanchia.style.left = '20px';
yanchia.style.top = '200px';
yanchia.style.color = 'aqua'; // 根据你的页面样式调整
yanchia.style.fontSize = '0px'; // 根据需要调整字体大小

document.addEventListener('DOMContentLoaded', loadHitSound);
document.addEventListener('keydown', function (event) {
    keyManager.processKeyDown(event.code);
    handleKeyInput(event.code);
});
document.addEventListener('keyup', function (event) {
    keyManager.processKeyUp(event.code);
    // 当松开击打start的键时，重置start弹幕的状态
    const action = getButtonAction(event.code);
    keytop(action);
});
document.addEventListener('mousedown', function (event) {
    if (event.button === 0) { // 左键
        keyManager.processKeyDown('KeyA');
        handleKeyInput('KeyA');
    } else if (event.button === 2) { // 右键
        keyManager.processKeyDown('KeyK');
        handleKeyInput('KeyK');
    }
});
document.addEventListener('mouseup', function (event) {
    if (event.button === 0) { // 左键
        const action = 'left';
        keyManager.processKeyUp('KeyA');
        handleKeyInput('KeyA');
        keytop(action);
    } else if (event.button === 2) { // 右键
        const action = 'right';
        keyManager.processKeyUp('KeyK');
        handleKeyInput('KeyK');
        keytop(action);
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    filePath = await getPathsJsonPath();
    console.log('文件路径：',filePath);
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Failed to load paths:', err);
            return;
        }

        const paths = JSON.parse(data);
        console.log('Music and JSON:', paths.musicPath, paths.jsonFilePath);
        initializeApplication(paths.musicPath, paths.jsonFilePath,paths.iconFilePath);
    });
})
document.getElementById('restartButton').addEventListener('click', function () {
    window.location.reload(); // 重新加载当前页面
});
document.getElementById('closeButton').addEventListener('click', function () {
    window.location.href = 'index.html'; // 更改页面地址返回首页
});
document.getElementById('closeButton').addEventListener('click', () => {
    ipcRenderer.send('open-index-and-close-current');
});
setInterval(() => {
    const backfull = document.getElementById('backfull');
    backfull.style.opacity = 0;
}, 1000);


