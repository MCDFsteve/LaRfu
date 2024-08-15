function keytop(action) {
    if (action) {
        // 这里调用的是 KeyManager 类中的 isAnyKeyPressedFromSet 方法
        if ((action === 'left' && !keyManager.isAnyKeyPressedFromSet(leftKeys)) ||
            (action === 'right' && !keyManager.isAnyKeyPressedFromSet(rightKeys))) {
            circles.forEach(danmaku => {
                if (danmaku.isStart && danmaku.isHitStarted && action === (danmaku.rail === 'a' ? 'left' : 'right')) {
                    danmaku.isHitStarted = false;
                    danmaku.atEightyPercent = false;
                    danmaku.resetStartPosition(); // 调用重置位置的方法
                    stopLongSound(); // 停止长音效
                }
            });
        }
    }
}
function initializeApplication(musicPath, jsonFilePath2, iconPath) {
    const progressBar = document.getElementById('progressBar');
    const timeDisplay = document.getElementById('timeDisplay');
    const songTitle = document.getElementById('songTitle');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingScreendown = document.getElementById('loadingScreendown');
    const particlesjs = document.getElementById('packpng');
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = musicPath;
    particlesjs.style.backgroundImage = `url(${iconPath})`;
    // 音乐可以播放通过时，尝试播放音乐
    audioPlayer.addEventListener('canplaythrough', () => {
        countdownStarted = false;
        // 延迟五秒再开始播放音乐，并隐藏加载界面
        setTimeout(() => {
            audioPlayer.play();
            audioPlayer.muted = true;
            loadingScreen.style.display = 'none';
            loadingScreendown.style.display = 'none';
            particlesjs.style.display = 'none';
            startCountdown();
        }, 3000);
    });
    fetch(jsonFilePath2)
        .then(response => response.json())
        .then(data => {
            musicTitle = data.music;
            number = data.number;
            songTitle.textContent = `${musicTitle}`;
            console.log('musicTitle:', musicTitle);
            if (data.mode && data.mode.one && data.mode.one.groups && data.mode.one.groups.length > 0) {
                const jsonData = preprocessDanmakus(data.mode.one.groups);
                initializeDanmakus(jsonData);  // 初始化弹幕
                requestAnimationFrame(animate); // 开始动画循环
            } else {
                console.log("No groups in JSON data or JSON data is empty");
            }
        })
        .catch(error => {
            console.error('Failed to load JSON data:', error);
        });
    audioPlayer.addEventListener('timeupdate', () => {
        progressBar.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        timeDisplay.textContent = formatTime(audioPlayer.currentTime);
        audioPlayer.muted = false;
    });
    // 在歌曲播放结束时调用
    audioPlayer.addEventListener('ended', () => {
        saveScoreToFile(totalScore, number);
    });
    scoreDisplay = document.getElementById('scoreDisplay');
    updateScoreDisplay(); // 更新分数显示
    loadInitialGameData();
};
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
// 获取 paths.json 的路径
async function getPathsJsonPath() {
    try {
        const pathsJsonPath = await ipcRenderer.invoke('get-paths-json-path');
        console.log('Paths.json path:', pathsJsonPath);
        return pathsJsonPath;
    } catch (error) {
        console.error('Failed to get paths.json path:', error);
    }
}
// 保存分数到文件的方法
function saveScoreToFile(totalScore, number) {
    // 通过 ipcRenderer 向主进程发送保存分数的请求
    ipcRenderer.send('save-score', { score: totalScore, number: number });
}
function resizeNewCanvas() {
    newCanvas.width = window.innerWidth;
    newCanvas.height = window.innerHeight;
}
function loadHitSound() {
    fetch('./sources/sound/hit_sound.mp3')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedBuffer => {
            buffer = decodedBuffer;
        })
        .catch(e => console.error('Error loading hit sound:', e));

    fetch('./sources/sound/hit_long.mp3')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(decodedBuffer => {
            bufferLong = decodedBuffer;
        })
        .catch(e => console.error('Error loading long hit sound:', e));
}
function playHitSound() {
    //console.log('Playing sound at context time:', audioContext.currentTime);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

function playlongSound() {
    if (bufferLong) {
        // 如果有一个现有的长音源在播放，先停止它
        if (longSoundSource) {
            longSoundSource.stop();
            longSoundSource.disconnect();
        }
        longSoundSource = audioContext.createBufferSource();
        longSoundSource.buffer = bufferLong;
        longSoundSource.loop = false; // 设置为循环播放
        longSoundSource.connect(audioContext.destination);
        longSoundSource.start(0);
    }
}

function stopLongSound() {
    if (bufferLong) {
        if (longSoundSource) {
            longSoundSource.stop();
            longSoundSource.disconnect();
            longSoundSource = null;
        }
    }
}
function startCountdown() {
    if (!countdownStarted) {
        countdownStarted = true;
        audioPlayer.pause();
        const countdownElement = document.getElementById('countdownDisplay');
        const playPauseButton = document.getElementById('playPauseButton');
        const restartButton = document.getElementById('restartButton');
        const closeButton = document.getElementById('closeButton');
        document.body.appendChild(countdownElement);
        countdownElement.style.display = 'block';

        let countdown = 3;
        countdownElement.innerText = countdown;

        const countdownInterval = setInterval(() => {
            countdown -= 1;
            countdownElement.innerText = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownElement.style.display = 'none';
                playPauseButton.style.display = 'block';
                restartButton.style.display = 'block';
                closeButton.style.display = 'block';
                countdownElement.style.display = 'none';
                audioPlayer.play();
                document.addEventListener('keydown', function (event) {
                    if (event.code === "Escape") {
                        togglePlayPause();  // 调用暂停/播放切换函数
                        event.preventDefault();  // 防止 Esc 默认行为（如退出全屏模式等）
                    }
                });

            }
        }, 1000);
    }
}
function parseTime(timeString) {
    if (timeString.includes(',')) {
        // 如果时间字符串包含逗号，说明有两个时间戳
        const times = timeString.split(',');
        return times.map(t => parseSingleTime(t.trim()));
    } else {
        const parts = timeString.split(':');
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        const milliseconds = parseInt(parts[2], 10);
        return [minutes * 60 + seconds + milliseconds / 1000];
    }
}
function parseSingleTime(time) {
    const parts = time.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    const milliseconds = parseInt(parts[2], 10);
    return minutes * 60 + seconds + milliseconds / 1000;
}
function handleKeyInput(eventCode) {
    const action = getButtonAction(eventCode);
    if (action) {
        const isAnyKeyPressed = keyManager.isAnyKeyPressedForAction(action);
        const isAnyKeyLongPressed = Object.keys(keyManager.longPressStates)
            .some(key => keyManager.longPressStates[key] && getButtonAction(key) === action);

        circles.forEach(danmaku => {
            if (danmaku.shouldBeHit(action, isAnyKeyPressed, isAnyKeyLongPressed)) {
                danmaku.hit();
            }
        });
    }
}
function updateScore(score) {
    totalScore += score;
    updateScoreDisplay();
}

function updateScoreDisplay() {
    totalScore = Math.floor(totalScore);
    let percentage = totalCircles > 0 ? (hitCircles / totalCircles * 100).toFixed(0) : '0';
    //scoreDisplay.textContent = `命中率: ${percentage}% (${hitCircles}/${totalCircles}) - 总分: ${totalScore}`;
    scoreDisplay.innerHTML = `<span class="totalScore">${totalScore}</span><br><span class="percentage">${percentage}%</span>`;
}
function showRealtimeScore(x, y, message) {
    // 创建一个新的div元素来显示得分
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = message;
    scoreDiv.style.position = 'absolute';
    scoreDiv.style.left = `${x}px`;
    scoreDiv.style.top = `${y}px`;
    scoreDiv.style.fontFamily = 'Orbitron';
    scoreDiv.style.fontWeight = 'bold';
    scoreDiv.style.zIndex = '1000'; // 确保得分显示在顶层
    scoreDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)'; // 阴影效果
    if (message === 'Great!') {
        scoreDiv.style.color = 'rgb(65,204,84)';
        scoreDiv.style.webkitTextStroke = '2px rgb(33,104,42)';
        scoreDiv.style.fontSize = '2vw';
    } else if (message === 'Perfect!!') {
        scoreDiv.style.color = 'rgb(235,255,59)';
        scoreDiv.style.webkitTextStroke = '2px rgb(90,104,33)';
        scoreDiv.style.fontSize = '2.3vw';
    } else if (message === 'Perfect+!!' || message === 'Excellent!!') {
        scoreDiv.style.color = 'rgb(255,59,59)';
        scoreDiv.style.webkitTextStroke = '2px rgb(104,33,33)';
        scoreDiv.style.fontSize = '2.6vw';
    } else if (message === 'Holding') {
        scoreDiv.style.color = 'rgb(59,160,255)';
        scoreDiv.style.webkitTextStroke = '2px rgb(33,52,104)';
        scoreDiv.style.fontSize = '2vw';
    } else {
        scoreDiv.style.color = 'rgb(145,145,145)';
        scoreDiv.style.webkitTextStroke = '2px rgb(0,0,0)';
        scoreDiv.style.fontSize = '1.8vw';
    }
    // 将新的得分div添加到文档中
    document.body.appendChild(scoreDiv);

    // 设置一定时间后移除该div
    setTimeout(() => {
        scoreDiv.remove();
    }, 1000);  // 1秒后隐藏分数显示
}

function formatTime(currentTime) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 1000);
    return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds, 3)}`;
}
function pad(number, digits = 2) {
    return number.toString().padStart(digits, '0');
}
function getButtonAction(code) {
    if (leftKeys.has(code)) {
        return 'left';
    } else if (rightKeys.has(code)) {
        return 'right';
    }
    return null;
}

function explode(x, y, isSpecial, rail, isLong, isCenter) {
    let particleCount = isSpecial ? 20 : 10; // 减少粒子数量
    let sizeFactor = isSpecial ? 1.5 : 1;
    let speedFactor = isSpecial ? 1.5 : 1;
    let lifetimeFactor = isSpecial ? 1.5 : 1;
    let maxRadius = 200;  // 设置圆环的最大半径
    let duration = 250;  // 设置圆环和正方形扩散的持续时间
    let maxSize = 30;  // 设置正方形的最大大小
    let lineWidth = 10;  // 设置圆环的线宽
    let squareRingRadius = 150; // 设置正方形环的最大半径
    let squareRingDuration = 500; // 设置正方形环的持续时间
    let squareRingLineWidth = 8; // 设置正方形环的线宽
    let circleRingRadius = 120; // 设置圆环的最大半径
    let circleRingDuration = 400; // 设置圆环的持续时间
    let circleRingLineWidth = 6; // 设置圆环的线宽
    if (isCenter) {
        yy = canvas.height * 0.8;
    } else {
        yy = y;
    }

    let colorFunction;
    if (isSpecial) {
        colorFunction = () => `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 1)`;
    } else {
        if (rail === 'a') {
            colorFunction = () => `rgba(${255}, ${Math.floor(Math.random() * 156) + 100}, 0, 1)`;
        } else {
            colorFunction = () => `rgba(${0}, ${Math.floor(Math.random() * 156) + 100}, 255, 1)`;
        }
    }

    for (let i = 0; i < particleCount; i++) {
        const color = colorFunction();
        particles.push(new Particle(x, yy, color, sizeFactor, speedFactor, lifetimeFactor));
    }

    // 添加圆环效果，使用粒子颜色
    const ringColor = colorFunction();
    particles.push(new Ring(x, yy, ringColor, maxRadius, duration, lineWidth));

    // 添加正方形效果，使用粒子颜色
    const squareColor = colorFunction();
    particles.push(new Square(x, yy, squareColor, maxSize, duration));

    // 添加正方形环效果，使用粒子颜色
    const squareRingColor = colorFunction();
    particles.push(new SquareRing(x, yy, squareRingColor, squareRingRadius, squareRingDuration, squareRingLineWidth));

    // 添加圆环效果，使用粒子颜色
    const circleRingColor = colorFunction();
    particles.push(new CircleRing(x, yy, circleRingColor, circleRingRadius, circleRingDuration, circleRingLineWidth));
    // 如果是中心点标记的弹幕，生成 UpwardFragment
    if (isLong) {
        for (let i = 0; i < 20; i++) { // 可以根据需要调整生成的碎片数量
            const color = colorFunction();
            particles.push(new UpwardFragment(x, yy, color, sizeFactor, speedFactor, lifetimeFactor));
        }
    }
}
function drawDefaultRectangles() {
    const rectangleY = canvas.height * 0.8 - 3.5;
    const rectangleHeight = 7;  // 矩形高度
    const shadowOffset = 10;  // 阴影偏移量
    const shadowBlur = 12;  // 高斯模糊半径
    const borderThickness = 2;  // 白色细边的厚度
    const centerLineThickness = 6;  // 中间竖线的厚度
    // 创建左半部分的阴影渐变
    const leftShadowGradient = ctx.createLinearGradient(0, rectangleY - shadowOffset + rectangleHeight / 4, 0, rectangleY + rectangleHeight + shadowOffset + rectangleHeight / 4);
    leftShadowGradient.addColorStop(0, 'rgba(255, 121, 121, 1)'); // 上部柔和红色阴影
    leftShadowGradient.addColorStop(1, 'rgba(255, 121, 121, 1)'); // 透明

    // 创建右半部分的阴影渐变
    const rightShadowGradient = ctx.createLinearGradient(0, rectangleY - shadowOffset + rectangleHeight / 4, 0, rectangleY + rectangleHeight + shadowOffset + rectangleHeight / 4);
    rightShadowGradient.addColorStop(0, 'rgba(121, 121, 255, 1)'); // 上部柔和蓝色阴影
    rightShadowGradient.addColorStop(1, 'rgba(121, 121, 255, 1)'); // 透明

    // 保存当前状态
    ctx.save();

    // 应用高斯模糊
    ctx.filter = `blur(${shadowBlur}px)`;

    // 绘制左半部分的阴影
    ctx.fillStyle = leftShadowGradient;
    ctx.fillRect(0, rectangleY - shadowOffset + rectangleHeight / 4, canvas.width / 2, rectangleHeight + shadowOffset * 2);

    // 绘制右半部分的阴影
    ctx.fillStyle = rightShadowGradient;
    ctx.fillRect(canvas.width / 2, rectangleY - shadowOffset + rectangleHeight / 4, canvas.width / 2, rectangleHeight + shadowOffset * 2);

    // 恢复状态
    ctx.restore();
    // 绘制左半部分的白色矩形边框
    ctx.fillStyle = 'white';
    ctx.fillRect(0, rectangleY - borderThickness, canvas.width / 2, borderThickness); // 上边
    ctx.fillRect(0, rectangleY + rectangleHeight, canvas.width / 2, borderThickness); // 下边
    ctx.fillRect(0, rectangleY - borderThickness, borderThickness, rectangleHeight + 2 * borderThickness); // 左边
    ctx.fillRect(canvas.width / 2 - borderThickness, rectangleY - borderThickness, borderThickness, rectangleHeight + 2 * borderThickness); // 右边

    // 绘制右半部分的白色矩形边框
    ctx.fillRect(canvas.width / 2, rectangleY - borderThickness, canvas.width / 2, borderThickness); // 上边
    ctx.fillRect(canvas.width / 2, rectangleY + rectangleHeight, canvas.width / 2, borderThickness); // 下边
    ctx.fillRect(canvas.width / 2, rectangleY - borderThickness, borderThickness, rectangleHeight + 2 * borderThickness); // 左边
    ctx.fillRect(canvas.width - borderThickness, rectangleY - borderThickness, borderThickness, rectangleHeight + 2 * borderThickness); // 右边
    // 绘制左半部分的白色矩形
    ctx.fillStyle = 'rgba(255, 121, 121, 0.5)';
    ctx.fillRect(0, rectangleY, canvas.width / 2, rectangleHeight);

    // 绘制右半部分的白色矩形
    ctx.fillStyle = 'rgba(121, 121, 255, 0.5)';
    ctx.fillRect(canvas.width / 2, rectangleY, canvas.width / 2, rectangleHeight);
    // 绘制最左边的白色竖线
    ctx.fillStyle = 'white';
    ctx.fillRect(0, rectangleY, centerLineThickness, rectangleHeight);

    // 绘制中间的白色竖线
    ctx.fillStyle = 'white';
    ctx.fillRect(canvas.width / 2 - centerLineThickness / 2, rectangleY, centerLineThickness, rectangleHeight);

    // 绘制最右边的白色竖线
    ctx.fillStyle = 'white';
    ctx.fillRect(canvas.width - centerLineThickness, rectangleY, centerLineThickness, rectangleHeight);
}
function showPerfectEffect() {
    const perfectDisplay = document.createElement('div');
    perfectDisplay.textContent = 'Perfect!!!';
    perfectDisplay.style.position = 'fixed';
    perfectDisplay.style.left = '50%';
    perfectDisplay.style.top = '50%';
    perfectDisplay.style.transform = 'translate(-50%, -50%)';
    perfectDisplay.style.fontSize = '10vw';
    perfectDisplay.style.color = 'red';
    perfectDisplay.style.fontFamily = 'Orbitron';
    perfectDisplay.style.fontWeight = 'bold';
    perfectDisplay.style.zIndex = '1000';
    perfectDisplay.style.opacity = '1';
    perfectDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    perfectDisplay.style.webkitTextStroke = '2px rgb(104,33,33)';
    perfectDisplay.style.fontSize = '2.6vw';
    perfectDisplay.style.transition = 'opacity 2s';
    document.body.appendChild(perfectDisplay);
    // 动画淡出
    setTimeout(() => {
        perfectDisplay.style.opacity = '0';
        setTimeout(() => document.body.removeChild(perfectDisplay), 2000);
    }, 1000);
}
function animateParticles() {
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw(ctx);
        if (!particle.isAlive()) {
            particles.splice(index, 1); // 移除生命周期结束的粒子或圆环或正方形或正方形环或圆环或上升碎片
        }
    });
}
function preprocessDanmakus(data) {
    let processedData = [];
    let previousWasLongA = false;  // 跟踪轨道A的长按弹幕
    let previousWasLongB = false;  // 跟踪轨道B的长按弹幕

    // 筛选出所有短弹幕并计算其数量
    const shortDanmakus = data.filter(group => parseTime(group.time).length === 1);
    const shortDanmakuCount = shortDanmakus.length;
    const portionSize = Math.ceil(shortDanmakuCount / 6); // 每份的大小

    let shortDanmakuIndex = 0;

    data.forEach(group => {
        const times = parseTime(group.time);
        if (times.length === 2) {
            // 长按弹幕，生成开始和结束弹幕
            processedData.push({
                ...group,
                time: formatTime(times[0]),
                long: true,
                start: true,
                end: false,
                center: false
            });

            processedData.push({
                ...group,
                time: formatTime(times[1]),
                long: true,
                start: false,
                end: true,
                center: false
            });
        } else {
            // 短按弹幕
            let reward = false;

            if ((shortDanmakuIndex + 1) % portionSize === 0 || shortDanmakuIndex === shortDanmakuCount - 1) {
                reward = true; // 每一份的最后一个短弹幕标记为reward
            }

            if (group.rail === 'a' && previousWasLongA) {
                reward = true;
                previousWasLongA = false;  // 重置长按标记
            } else if (group.rail === 'b' && previousWasLongB) {
                reward = true;
                previousWasLongB = false;  // 重置长按标记
            }

            processedData.push({
                ...group,
                long: false,
                reward: reward
            });

            shortDanmakuIndex++;
        }
    });

    return processedData;
}
// 计算x位置的函数
function calculateXPosition(rail, road, canvasWidth) {
    let segmentWidth, start;
    if (rail === 'a') {
        segmentWidth = 0.5 / 8;
        start = 0;
    } else if (rail === 'b') {
        segmentWidth = (1.0 - 0.5) / 8;
        start = 0.5;
        road = 9 - road;  // 调整road值，从外到内排列
    } else {
        throw new Error('Invalid rail value');
    }
    // 计算中值
    const midPoint = start + (road - 1) * segmentWidth + (segmentWidth / 2);
    return midPoint * canvasWidth;
}
// 初始化弹幕
function initializeDanmakus(data) {
    totalCircles = 0;  // 重置总弹幕数
    circles = [];  // 重置弹幕数组

    for (let i = 0; i < data.length; i++) {
        const group = data[i];
        const times = parseTime(group.time);
        const xPosition = calculateXPosition(group.rail, group.road, canvas.width);
        const yPosition = -canvas.height * 0.2; // 初始Y位置在画布顶部之外
        const radius = canvas.width / 32; // 弹幕大小
        const speed = canvas.height; // 每秒移动整个屏幕高度

        if (group.start) {
            // 处理长弹幕
            const startTime = times[0];
            const endTime = parseTime(data[i + 1].time)[0];
            const duration = endTime - startTime;
            const longDanmakuCount = Math.ceil(duration / 0.1);
            totalCircles += longDanmakuCount;  // 将长弹幕计入总弹幕数

            // 生成开始和结束弹幕
            const startDanmaku = new Danmaku(xPosition, yPosition, radius, speed, startTime, group.rail, group.road, group.time, true, group.reward, true, false, group.center, group.speed);
            circles.push(startDanmaku);

            const endDanmaku = new Danmaku(xPosition, yPosition, radius, speed, endTime, group.rail, group.road, group.time, true, group.reward, false, true, group.center, group.speed);
            circles.push(endDanmaku);

            i++;  // 跳过 end 弹幕
        } else {
            // 处理短弹幕
            totalCircles++;  // 将短弹幕计入总弹幕数
            const danmaku = new Danmaku(xPosition, yPosition, radius, speed, times[0], group.rail, group.road, group.time, false, group.reward, group.start, group.end, group.center, group.speed);
            circles.push(danmaku);
        }
    }
    console.log(`Total danmakus: ${totalCircles}`);
}
function updateAndDrawDanmakus(currentTime) {
    const audioTime = formatTime(audioPlayer.currentTime);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    newCtx.clearRect(0, 0, newCanvas.width, newCanvas.height);
    // 更新并绘制动画矩形在新 canvas 上
    particles.forEach(particle => {
        particle.update();
        particle.draw(newCtx); // 使用 newCtx 绘制
    });
    // 清理不再活跃的粒子
    particles = particles.filter(particle => particle.isAlive());
    circles.forEach(circle => {
        circle.checkAndDrawRectangle2(newCtx); // 使用新 canvas 的上下文
    });
    // 绘制默认的红色和蓝色矩形
    drawDefaultRectangles();
    // 先绘制center弹幕
    circles.forEach(circle => {
        if (circle.active && circle.center) {
            circle.update(currentTime, audioTime);
            handleDanmakuHitDetection(circle); // 检测击打
            circle.draw(ctx);
            circle.checkAndDrawRectangle(ctx); // 检查并绘制短长条矩形
        }
    });

    // 然后绘制start和end弹幕
    circles.forEach(circle => {
        if (circle.active && (circle.start || circle.end)) {
            circle.update(currentTime, audioTime);
            handleDanmakuHitDetection(circle); // 检测击打
            circle.draw(ctx);
            circle.checkAndDrawRectangle(ctx); // 检查并绘制短长条矩形
        }
    });

    // 绘制剩下的弹幕
    circles.forEach(circle => {
        if (circle.active && !circle.center && !circle.start && !circle.end) {
            circle.update(currentTime, audioTime);
            handleDanmakuHitDetection(circle); // 检测击打
            circle.draw(ctx);
            circle.checkAndDrawRectangle(ctx); // 检查并绘制短长条矩形
        }
    });

    circles = circles.filter(circle => circle.active);
}
function handleDanmakuHitDetection(danmaku) {
    const action = danmaku.rail === 'a' ? 'left' : 'right';
    const relevantKeys = Object.keys(keyManager.keyStates).filter(key => getButtonAction(key) === action);
    if (relevantKeys.some(key => keyManager.isKeyPressed(key) && danmaku.shouldBeHit(action, keyManager.isKeyPressed(key), keyManager.isKeyLongPressed(key)))) {
        danmaku.hit();
        //console.log(`Danmaku hit detected: ${danmaku}`);
    }
}
function animate(currentTime) {
    const timeSeconds = audioPlayer.currentTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    newCtx.clearRect(0, 0, newCanvas.width, newCanvas.height);
    updateAndDrawDanmakus(timeSeconds);
    animateParticles(); // 确保在请求下一帧前更新粒子动画
    requestAnimationFrame(animate);
    // 更新FPS计数
    if (currentTime > lastFpsUpdate + 1000) { // 每秒更新一次FPS值
        fps = framesThisSecond;
        framesThisSecond = 0;
        lastFpsUpdate = currentTime;
    }
    framesThisSecond++;
    displayFps(); // 显示FPS
}
function displayFps() {
    document.getElementById('fpsDisplay').textContent = `${fps}`;
}
function togglePlayPause() {
    if (countdownStarted2) {
        // 如果倒计时正在进行，不执行任何操作
        return;
    }
    if (isPlaying) {
        isPlaying = false;
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
        audioPlayer.pause();
        overlay.classList.remove('inactive');
        overlay.style.display = 'block';
        keyInputsEnabled = false;
        clickInputsEnabled = false;  // 禁用点击事件响应
    } else {
        // 倒计时启动
        countdownStarted2 = true;
        audioPlayer.pause();
        showCountdown(() => {
            isPlaying = true;
            audioPlayer.play();
            pauseIcon.style.display = 'block';
            playIcon.style.display = 'none';
            overlay.style.display = 'none';
            keyInputsEnabled = true;
            clickInputsEnabled = true;
            countdownStarted2 = false;  // 倒计时结束
        });
    }
}
function showCountdown(callback) {
    let countdown = 3;
    const countdownElement = document.getElementById('countdownDisplay');
    countdownElement.style.display = 'block'; // 确保倒计时显示
    countdownElement.innerText = countdown; // 设置初始倒计时值
    const countdownInterval = setInterval(() => {
        countdown -= 1;
        countdownElement.innerText = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            overlay.classList.add('inactive');
            countdownElement.style.display = 'none'; // 隐藏倒计时，而不是移除它
            setTimeout(() => {
                callback();
            }, 200);  // 1秒后隐藏分数显示
        }
    }, 1000);
}