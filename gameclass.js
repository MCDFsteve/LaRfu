class KeyManager {
    constructor() {
        this.keyStates = {};
        this.longPressStates = {};
        this.keyTimers = {};
    }

    processKeyDown(eventCode) {
        if (!this.keyStates[eventCode]) {
            this.keyStates[eventCode] = true;
            pressedKeys.add(eventCode);

            if (this.keyTimers[eventCode]) {
                clearTimeout(this.keyTimers[eventCode]);
            }

            this.keyTimers[eventCode] = setTimeout(() => {
                if (this.keyStates[eventCode]) {
                    this.longPressStates[eventCode] = true;
                }
            }, 100);
        }
    }

    processKeyUp(eventCode) {
        this.keyStates[eventCode] = false;
        this.longPressStates[eventCode] = false;
        pressedKeys.delete(eventCode);

        if (this.keyTimers[eventCode]) {
            clearTimeout(this.keyTimers[eventCode]);
        }

        const action = getButtonAction(eventCode);
        if ((action === 'left' && !this.isAnyKeyPressedFromSet(leftKeys)) ||
            (action === 'right' && !this.isAnyKeyPressedFromSet(rightKeys))) {
            //stopLongSound();
            circles.forEach(danmaku => {
                if (danmaku.isStart && danmaku.isHitStarted && action === (danmaku.rail === 'a' ? 'left' : 'right')) {
                    danmaku.isHitStarted = false;
                    danmaku.atEightyPercent = false;
                    danmaku.resetStartPosition();
                }
            });
        }
    }

    isKeyPressed(eventCode) {
        return this.keyStates[eventCode];
    }

    isKeyLongPressed(eventCode) {
        return this.longPressStates[eventCode];
    }

    isAnyKeyPressedForAction(action) {
        const relevantKeys = action === 'left' ? leftKeys : rightKeys;
        return this.isAnyKeyPressedFromSet(relevantKeys);
    }

    isAnyKeyPressedFromSet(keySet) {
        for (const key of keySet) {
            if (this.keyStates[key]) {
                return true;
            }
        }
        return false;
    }
}
class Danmaku {
    constructor(x, y, radius, speed, targetTime, rail, road, time, long, reward, start, end, center, Gspeed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
        this.targetTime = targetTime;
        this.rail = rail;
        this.road = road;
        this.active = true;
        this.time = time;
        this.isLong = long;
        this.start = start;
        this.end = end;
        this.center = center;
        this.gspeed = Gspeed;
        this.reward = reward;
        this.atEightyPercent = false;
        this.eightyPercentTime = null;
        this.hitOnce = false;
        this.isHitStarted = false;
        this.isStart = start;
        this.isEnd = end;
        this.nextDanmaku = null; // 用于存储下一个弹幕对象
        this.lastScoreTime = 0; // 上次记分时间
        this.longHitCount = 0;
        this.isOverlapping = false;
        this.alpha = 1.0; // 初始化透明度为1.0
        this.next = null;
    }

    resetStartPosition() {
        const elapsed = audioPlayer.currentTime - parseTime(this.time);
        this.targetTime = audioPlayer.currentTime; // 更新目标时间为当前时间
        this.y = canvas.height * 0.8; // 重置y位置为0.8
    }

    update(currentTime, audioTime) {
        if (this.isHitStarted) {
            this.y = canvas.height * 0.8;
            if (currentTime - this.lastScoreTime >= 0.1) {
                this.lastScoreTime = currentTime;
                this.addScoreAndEffect();
                this.longHitCount++;
                hitCircles++;
            }
            if (this.nextDanmaku && this.nextDanmaku.y >= canvas.height * 0.8) {
                this.active = false;
                this.nextDanmaku.active = false;
                showRealtimeScore(this.x, this.y, 'Excellent!!');
                let score = 2000;
            }
        } else {
            const timeElapsed = currentTime - this.targetTime;
            this.y = canvas.height * 0.8 + this.speed / this.gspeed * timeElapsed;

            if (!this.atEightyPercent && this.y >= canvas.height * 0.8) {
                this.atEightyPercent = true;
                yanchia.textContent = `${audioPlayer.currentTime - parseTime(this.time)}`;
            }

            if (this.y > canvas.height * 0.89 && this.y < canvas.height * 0.91) {
                showRealtimeScore(this.x, canvas.height * 0.78, 'Miss!');
            }

            if (this.y > canvas.height * 100) {
                this.active = false;
            }
            if (this.isStart && !this.nextDanmaku) {
                const currentIndex = circles.indexOf(this);
                const nextDanmaku = circles.slice(currentIndex + 1).find(circle => circle.isEnd && circle.rail === this.rail && circle.road === this.road);
                this.nextDanmaku = nextDanmaku || null;
                this.next = this.nextDanmaku.targetTime
            }
            if (this.isStart && this.nextDanmaku && this.y + this.radius >= this.nextDanmaku.y - this.nextDanmaku.radius) {
                this.isOverlapping = true;
                this.nextDanmaku.isOverlapping = true;
            }
        }
    }

    startAlphaTransition() {
        const duration = 500; // Duration in milliseconds
        const interval = 10; // Interval time for each step
        const step = (this.alpha - 0.4) / (duration / interval); // Step value for each interval

        const intervalId = setInterval(() => {
            if (this.alpha > 0.4) {
                this.alpha -= step;
                if (this.alpha < 0.4) this.alpha = 0.4;
            } else {
                clearInterval(intervalId);
            }
        }, interval);
    }

    addScoreAndEffect() {
        let score = 500;
        showRealtimeScore(this.x, this.y * 0.9, 'Holding');
        updateScore(score);
        explode(this.x, this.y, this.reward, this.rail, this.isLong, this.center);
    }

    shouldBeHit(action, isKeyPressed, isKeyLongPressed) {
        const expectedRail = action === 'left' ? 'a' : 'b';
        const hitWindowStart = canvas.height * 0.77;
        const hitWindowEnd = canvas.height * 0.85;
        const hitExactPosition = canvas.height * 0.8;

        if (this.rail === expectedRail && this.active && !this.hitOnce) {
            if (isKeyPressed) {
                if (this.y >= hitWindowStart && this.y <= hitWindowEnd) {
                    if (this.isStart || !this.isLong) {
                        if (this.start) {
                            if (isKeyLongPressed && isNext) {
                                if ((this.center && Math.abs(this.y - hitExactPosition) < this.radius) || this.end) {
                                    return true;
                                }
                            } else if (!this.center && !this.end && !isKeyLongPressed) {
                                return true;
                            }
                        } else if (!this.isLong && !isKeyLongPressed) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    hit() {
        if (!this.active || this.hitOnce) return;
        if (this.isStart && !this.isHitStarted) {
            playHitSound();
            this.isHitStarted = true;
            this.hitOnce = true;
            let score = this.calculateScore();
            updateScore(score);
            updateScoreDisplay();
            explode(this.x, this.y, this.reward, this.rail, this.isLong, this.center);

            if (consecutiveHits >= 50) {
                showPerfectEffect();
                updateScore(100);
                consecutiveHits = 0;
            }
        } else {
            this.active = false;
            this.hitOnce = true;
            playHitSound();
            consecutiveHits++;
            let score = this.calculateScore();
            updateScore(score);
            updateScoreDisplay();
            explode(this.x, this.y, this.reward, this.rail, this.isLong, this.center);

            if (consecutiveHits >= 50) {
                showPerfectEffect();
                updateScore(100);
                consecutiveHits = 0;
            }
        }
    }

    calculateScore() {
        let score = 0;
        const yPercentage = this.y / canvas.height;

        if (this.reward) {
            if ((yPercentage >= 0.75 && yPercentage < 0.78) || (yPercentage > 0.85 && yPercentage < 0.9)) {
                // 计算离 0.78 或 0.85 的距离
                let distanceToMax;
                if (yPercentage < 0.78) {
                    distanceToMax = Math.abs(yPercentage - 0.78);
                } else {
                    distanceToMax = Math.abs(yPercentage - 0.85);
                }

                // 计算分数，离 0.78 或 0.85 越近，分数越高
                const maxDistance = 0.03; // 0.78 - 0.75 或 0.9 - 0.85
                const minScore = 2000;
                const maxScore = 3000;
                showRealtimeScore(this.x, this.y, 'Great!');
                score = maxScore - ((distanceToMax / maxDistance) * (maxScore - minScore));
                hitCircles += 0.5;
            } else if (yPercentage >= 0.78 && yPercentage <= 0.85) {
                // 计算离 0.8 的距离
                let distanceToTarget = Math.abs(yPercentage - 0.8);

                // 计算分数，离 0.8 越近，分数越高
                const maxDistance = 0.07; // 0.85 - 0.78
                const minScore = 4000;
                const maxScore = 6000;
                if (yPercentage >= 0.79 && yPercentage <= 0.82) {
                    showRealtimeScore(this.x, this.y, 'Perfect+!!');
                } else {
                    showRealtimeScore(this.x, this.y, 'Perfect!!');
                }
                score = maxScore - ((distanceToTarget / maxDistance) * (maxScore - minScore));
                hitCircles += 1;
            }
        } else if (this.isStart) {
            if ((yPercentage >= 0.75 && yPercentage < 0.78) || (yPercentage > 0.85 && yPercentage < 0.9)) {
                // 计算离 0.78 或 0.85 的距离
                let distanceToMax;
                if (yPercentage < 0.78) {
                    distanceToMax = Math.abs(yPercentage - 0.78);
                } else {
                    distanceToMax = Math.abs(yPercentage - 0.85);
                }

                // 计算分数，离 0.78 或 0.85 越近，分数越高
                const maxDistance = 0.03; // 0.78 - 0.75 或 0.9 - 0.85
                const minScore = 500;
                const maxScore = 700;
                showRealtimeScore(this.x, this.y, 'Great!');
                score = maxScore - ((distanceToMax / maxDistance) * (maxScore - minScore));
                hitCircles += 0.5;
            } else if (yPercentage >= 0.78 && yPercentage <= 0.85) {
                // 计算离 0.8 的距离
                let distanceToTarget = Math.abs(yPercentage - 0.8);

                // 计算分数，离 0.8 越近，分数越高
                const maxDistance = 0.07; // 0.85 - 0.78
                const minScore = 1000;
                const maxScore = 2000;
                if (yPercentage >= 0.79 && yPercentage <= 0.82) {
                    showRealtimeScore(this.x, this.y, 'Perfect+!!');
                } else {
                    showRealtimeScore(this.x, this.y, 'Perfect!!');
                }
                score = maxScore - ((distanceToTarget / maxDistance) * (maxScore - minScore));
                hitCircles += 1;
            }
        } else if ((yPercentage >= 0.75 && yPercentage < 0.78) || (yPercentage > 0.85 && yPercentage < 0.9)) {
            // 计算离 0.78 或 0.85 的距离
            let distanceToMax;
            if (yPercentage < 0.78) {
                distanceToMax = Math.abs(yPercentage - 0.78);
            } else {
                distanceToMax = Math.abs(yPercentage - 0.85);
            }

            // 计算分数，离 0.78 或 0.85 越近，分数越高
            const maxDistance = 0.03; // 0.78 - 0.75 或 0.9 - 0.85
            const minScore = 500;
            const maxScore = 700;
            showRealtimeScore(this.x, this.y, 'Great!');
            score = maxScore - ((distanceToMax / maxDistance) * (maxScore - minScore));
            hitCircles += 0.5;
        } else if (yPercentage >= 0.78 && yPercentage <= 0.85) {
            // 计算离 0.8 的距离
            let distanceToTarget = Math.abs(yPercentage - 0.8);
            // 计算分数，离 0.8 越近，分数越高
            const maxDistance = 0.07; // 0.85 - 0.78
            const minScore = 1000;
            const maxScore = 2000;
            if (yPercentage >= 0.79 && yPercentage <= 0.82) {
                showRealtimeScore(this.x, this.y, 'Perfect+!!');
            } else {
                showRealtimeScore(this.x, this.y, 'Perfect!!');
            }
            score = maxScore - ((distanceToTarget / maxDistance) * (maxScore - minScore));
            hitCircles += 1;
        }
        return score;
    }
    draw(ctx) {
        if (!this.active) return;
        let imgId;

        if (this.isStart && this.nextDanmaku && this.y >= canvas.height * 0.9 + this.radius) {
            if (!this.transitionStarted) {
                this.startAlphaTransition();
                this.transitionStarted = true;
            }
        } else {
            this.alpha = 1.0;
            this.transitionStarted = false;
        }
        ctx.globalAlpha = this.alpha;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;

        if (this.isStart && this.nextDanmaku) {
            let bodyImgId = this.rail === 'a' ? 'longDanmakuImage' : 'longDanmakuImage2';
            const bodyImg = document.getElementById(bodyImgId);
            const bodyHeight = this.nextDanmaku.y - this.y;
            ctx.drawImage(bodyImg, this.x - this.radius, this.y, this.radius * 2, bodyHeight);
        }

        if (this.isOverlapping) {
            if (this.rail === 'a') {
                imgId = 'danmakuImage6';
            } else {
                imgId = 'danmakuImage7';
            }
        } else if (this.isLong && this.rail === 'a') {
            if (this.isStart) {
                imgId = 'longStartDanmakuImage';
            } else if (this.isEnd) {
                imgId = 'longEndDanmakuImage';
            } else {
                imgId = 'longDanmakuImage';
            }
        } else if (this.isLong && this.rail === 'b') {
            if (this.isStart) {
                imgId = 'longStartDanmakuImage2';
            } else if (this.isEnd) {
                imgId = 'longEndDanmakuImage2';
            } else {
                imgId = 'longDanmakuImage2';
            }
        } else if (this.rail === 'a') {
            if (this.reward) {
                imgId = 'rewardDanmakuImage';
            } else {
                imgId = 'danmakuImage';
            }
        } else if (this.rail === 'b') {
            if (this.reward) {
                imgId = 'rewardDanmakuImage2';
            } else {
                imgId = 'danmakuImage2';
            }
        } const img = document.getElementById(imgId);
        ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    checkAndDrawRectangle(ctx) {
        const yPercentage = this.y / canvas.height;
        const rectangleY = canvas.height * 0.8 - 3.5;
        const rectangleHeight = 7;
        if (yPercentage >= 0.75 && yPercentage <= 0.85) {
            ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
            const rectX = this.x - this.radius;
            const rectWidth = this.radius * 2;
            ctx.fillRect(rectX, rectangleY, rectWidth, rectangleHeight);
        }
    }
    checkAndDrawRectangle2(ctx) {
        const yPercentage = this.y / canvas.height;
        const rectangleY = canvas.height * 0.8;
        let splashHeight = canvas.height * 0.3 / this.gspeed * yPercentage; // 这里根据 gspeed 计算 height
        let animationDuration = 1 / this.gspeed; // 这里根据 gspeed 计算持续时间
        if (this.start) {
            // 初始化乘数和方向
            if (this.multiplier === undefined) {
                this.multiplier = 0.8;
                this.multiplierDirection = -1;
                this.lastUpdate = Date.now();
            }

            // 每0.1秒更新一次乘数
            const now = Date.now();
            if (now - this.lastUpdate >= 75 * this.gspeed) {
                if (this.multiplier >= 0.8) {
                    this.multiplierDirection = -1;
                } else if (this.multiplier <= 0.6) {
                    this.multiplierDirection = 1;
                }
                this.multiplier += this.multiplierDirection * 0.1;
                this.lastUpdate = now;
            }

            // 使用更新后的乘数计算 splashHeight
            splashHeight = canvas.height * this.multiplier / this.gspeed * yPercentage;
        }
        if (yPercentage >= 0.75 && yPercentage <= 0.85) {
            const rectX = this.x - this.radius;
            const rectWidth = this.radius * 2;
            if (this.reward) {
                particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(255, 121, 239, 0.5)', splashHeight, animationDuration));
            }
            // 添加动画矩形到粒子数组
            else if (this.x < canvas.width / 2) {
                if (this.road === 1 || this.road === 3 || this.road === 5 || this.road === 7) {
                    if (this.isLong) {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(255, 146, 121, 0.5)', splashHeight, animationDuration));

                    } else {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(255, 121, 121, 0.5)', splashHeight, animationDuration));
                    }
                } else {
                    if (this.isLong) {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(218, 128, 104, 0.5)', splashHeight, animationDuration));

                    } else {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(192, 91, 91, 0.5)', splashHeight, animationDuration));
                    }
                }
            } else {
                if (this.road === 1 || this.road === 3 || this.road === 5 || this.road === 7) {
                    if (this.isLong) {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(121, 202, 251, 0.5)', splashHeight, animationDuration));

                    } else {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(121, 121, 256, 0.5)', splashHeight, animationDuration));
                    }
                } else {
                    if (this.isLong) {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(91, 153, 192, 0.5)', splashHeight, animationDuration));

                    } else {
                        particles.push(new AnimatedRectangle(rectX, rectangleY + 5, rectWidth, 'rgba(91, 91, 192, 0.5)', splashHeight, animationDuration));
                    }
                }
            }
        }
    }
}
class AnimatedRectangle {
    constructor(x, y, width, color, splashHeight, animationDuration, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.color = color;
        this.splashHeight = splashHeight;
        this.animationDuration = animationDuration;
        this.height = 0;
        this.direction = 1; // 1表示向上，-1表示向下
        this.alive = true;
        this.speed = animationDuration * 6; // 动画速度
    }

    update() {
        if (this.direction === 1) {
            this.height += this.speed; // 使用 speed 参数控制高度增加
            if (this.height >= this.splashHeight) {
                this.direction = -1;
            }
        } else {
            this.height -= this.speed; // 使用 speed 参数控制高度减少
            if (this.height <= 0) {
                this.direction = 1;
            }
        }
        if (this.height <= 0) {
            this.alive = false; // 动画结束后标记为不活跃
        }
    }

    draw(ctx) {
        const canvasId = ctx.canvas ? ctx.canvas.id : 'Unknown canvas';
        if (canvasId === 'webglCanvas') { // 假设你的canvas的ID是'webglCanvas'
            return; // 拒绝在 webglCanvas 上绘制
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height - 5, this.width, this.height);
    }

    isAlive() {
        return this.alive;
    }
}
class Square {
    constructor(x, y, color, maxSize, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.maxSize = maxSize;
        this.duration = duration;
        this.size = 0;
        this.alpha = 1;
        this.startTime = performance.now();
        this.initAnimation();
    }

    initAnimation() {
        anime({
            targets: this,
            size: this.maxSize,
            alpha: { value: 0, duration: this.duration, easing: 'linear' },
            duration: this.duration,
            easing: 'easeOutQuad'
        });
    }

    update() {
        // 由于使用了anime.js的动画更新，这里不需要手动更新大小和透明度
    }

    draw(ctx) {
        if (this.alpha > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.PI / 4); // 45度旋转
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}
class Ring {
    constructor(x, y, color, maxRadius, duration, lineWidth) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.lineWidth = lineWidth;
        this.radius = 0;
        this.alpha = 1;
        this.startTime = performance.now();
    }

    update() {
        const elapsed = performance.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        this.radius = progress * this.maxRadius;
        this.alpha = 1 - progress;
    }

    draw(ctx) {
        if (this.alpha > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.lineWidth;
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}
class Particle {
    constructor(x, y, color, sizeFactor, speedFactor, lifetimeFactor) {
        this.initialX = x;
        this.initialY = y;
        this.sizeFactor = sizeFactor;
        this.color = color;
        this.lifetime = 120 * lifetimeFactor;
        this.alpha = 0.6;
        this.startTime = performance.now();

        this.updatePosition();
        this.initAnimation();
        this.startRepositioning();
    }

    updatePosition() {
        const offsetX = (Math.random() - 0.5) * 200; // 随机生成在中心点附近更远的距离
        const offsetY = (Math.random() - 0.5) * 200;
        this.x = this.initialX + offsetX;
        this.y = this.initialY + offsetY;
        this.size = (Math.random() * 10 + 5) * this.sizeFactor;
    }

    startRepositioning() {
        this.repositionInterval = setInterval(() => {
            this.updatePosition();
        }, 100); // 每0.1秒重新分布一次
    }

    initAnimation() {
        anime({
            targets: this,
            alpha: [
                { value: 0, duration: this.lifetime, easing: 'linear' }
            ],
            complete: () => {
                this.lifetime = 0;
                clearInterval(this.repositionInterval); // 清除定时器
            }
        });
    }

    update() {
        const elapsed = performance.now() - this.startTime;
        if (elapsed > this.lifetime) {
            this.alpha = 0;
        }
    }

    draw(ctx) {
        if (this.alpha > 0 && this.size > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}
class SquareRing {
    constructor(x, y, color, maxRadius, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.size = 0;
        this.alpha = 1;
        this.startTime = performance.now();

        this.initAnimation();
    }

    initAnimation() {
        anime({
            targets: this,
            size: [
                { value: this.maxRadius, duration: this.duration / 2, easing: 'easeOutQuad' },
                { value: 0, duration: this.duration / 2, easing: 'easeInQuad' }
            ],
            alpha: [
                { value: 1, duration: this.duration / 2, easing: 'linear' },
                { value: 0, duration: this.duration / 2, easing: 'linear' }
            ],
            complete: () => {
                this.alpha = 0;
            }
        });
    }

    update() {
        const elapsed = performance.now() - this.startTime;
        if (elapsed > this.duration) {
            this.alpha = 0;
        }
    }

    draw(ctx) {
        if (this.alpha > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 5; // 设置环的线宽
            ctx.globalAlpha = this.alpha;
            ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}
class CircleRing {
    constructor(x, y, color, maxRadius, duration, lineWidth) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.lineWidth = lineWidth; // 添加线宽参数
        this.size = 0;
        this.alpha = 1;
        this.startTime = performance.now();

        this.initAnimation();
    }

    initAnimation() {
        anime({
            targets: this,
            size: [
                { value: this.maxRadius, duration: this.duration / 2, easing: 'easeOutQuad' },
                { value: 0, duration: this.duration / 2, easing: 'easeInQuad' }
            ],
            alpha: [
                { value: 1, duration: this.duration / 2, easing: 'linear' },
                { value: 0, duration: this.duration / 2, easing: 'linear' }
            ],
            complete: () => {
                this.alpha = 0;
            }
        });
    }

    update() {
        const elapsed = performance.now() - this.startTime;
        if (elapsed > this.duration) {
            this.alpha = 0;
        }
    }

    draw(ctx) {
        if (this.alpha > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.lineWidth; // 使用线宽参数
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}
class UpwardFragment {
    constructor(x, y, color, sizeFactor, speedFactor, lifetimeFactor) {
        this.baseX = x + (Math.random() - 0.5) * 150; // 随机生成在中心点左右延伸50像素内
        this.initialY = y;
        this.x = this.baseX;
        this.y = this.initialY;
        this.initialSize = (Math.random() * 10 + 5) * sizeFactor;
        this.size = this.initialSize;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 2 * speedFactor, // 随机水平速度
            y: -(Math.random() * 5 + 5) * speedFactor // 随机垂直速度，朝上
        };
        this.lifetime = 120 * lifetimeFactor;
        this.alpha = 1;
        this.startTime = performance.now();
        this.waveAmplitude = (Math.random() * 10 + 10) * sizeFactor; // 波浪振幅
        this.waveFrequency = (Math.random() * 0.1 + 0.05) * speedFactor; // 波浪频率
    }

    update() {
        const elapsedTime = (performance.now() - this.startTime) / 1000;
        this.y += this.velocity.y; // 更新y坐标
        this.x = this.baseX + Math.sin(elapsedTime * this.waveFrequency * 2 * Math.PI) * this.waveAmplitude;

        this.alpha -= 1 / this.lifetime;
        this.lifetime--;
        if (this.lifetime <= 0) {
            this.alpha = 0;
        }
    }

    draw(ctx) {
        if (this.alpha > 0 && this.size > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    isAlive() {
        return this.alpha > 0;
    }
}