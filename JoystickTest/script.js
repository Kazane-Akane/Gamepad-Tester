const canvasLeft = document.getElementById('joystick-canvas-left');
const ctxLeft = canvasLeft.getContext('2d');
const canvasRight = document.getElementById('joystick-canvas-right');
const ctxRight = canvasRight.getContext('2d');
const selectElement = document.getElementById('gamepad-select');

let selectedGamepadIndex = 0;
let animationFrameId = null;
let pathPointsLeft = []; // 用于存储左摇杆轨迹点的数组
let pathPointsRight = []; // 用于存储右摇杆轨迹点的数组

// 绘制静态背景（圆圈和十字线）
function drawStaticBackground(ctx) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = 150;

    // 绘制标准圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制十字线
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, ctx.canvas.height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(ctx.canvas.width, centerY);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// 绘制单个轨迹扇形或线条
function drawPath(ctx, x, y) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = 150;
    const scale = 150;

    const angle = Math.atan2(y, x);
    const distance = Math.sqrt(Math.pow(x * scale, 2) + Math.pow(y * scale, 2));
    
    // 计算扇形绘制的起始和结束角度，创建块状效果
    const startAngle = angle - 0.1; // 调整此值以改变扇形宽度
    const endAngle = angle + 0.1;

    // 绘制蓝色扇形轨迹 (始终绘制到圆圈内)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    // 扇形半径取摇杆距离和圆圈半径中的最小值，确保蓝色部分不会超出圆圈
    const sectorRadius = Math.min(distance, radius);
    ctx.arc(centerX, centerY, sectorRadius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 123, 255, 1)'; // 透明度调整为100%
    ctx.fill();

    // 如果摇杆超出圆圈，绘制红色部分
    if (distance > radius) {
        // 计算红色轨迹的四个顶点，形成一个四边形
        const innerX1 = centerX + Math.cos(startAngle) * radius;
        const innerY1 = centerY + Math.sin(startAngle) * radius;
        const innerX2 = centerX + Math.cos(endAngle) * radius;
        const innerY2 = centerY + Math.sin(endAngle) * radius;

        const outerX1 = centerX + Math.cos(startAngle) * distance;
        const outerY1 = centerY + Math.sin(startAngle) * distance;
        const outerX2 = centerX + Math.cos(endAngle) * distance;
        const outerY2 = centerY + Math.sin(endAngle) * distance;
        
        ctx.beginPath();
        ctx.moveTo(innerX1, innerY1);
        ctx.lineTo(outerX1, outerY1);
        ctx.lineTo(outerX2, outerY2);
        ctx.lineTo(innerX2, innerY2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 1)'; // 透明度调整为100%
        ctx.fill();
    }
}

// 绘制中心红点
function drawRedDot(ctx, x, y) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const scale = 150; 
    
    const drawX = centerX + x * scale;
    const drawY = centerY + y * scale;
    
    ctx.beginPath();
    ctx.arc(drawX, drawY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6347';
    ctx.fill();
}

/**
 * 根据轨迹点超出圆圈的总面积来计算错误率。
 * @param {Array<Object>} pathPoints - 轨迹点数组，每个点包含x和y坐标。
 * @returns {number} 错误率百分比。
 */
function calculateErrorRate(pathPoints) {
    if (pathPoints.length < 20) { // 需要至少20个点来获得稳定的统计数据
        return 0;
    }

    let totalAreaError = 0;
    // 摇杆的理想最大半径为1.0
    const idealRadius = 1.0; 

    // 计算每个点超出圆圈的“面积”
    pathPoints.forEach(point => {
        const radius = Math.sqrt(point.x * point.x + point.y * point.y);
        // 只计算超出理想半径的部分
        const areaError = Math.max(0, radius - idealRadius); 
        totalAreaError += areaError;
    });

    // 错误率 = (总超出面积 / 轨迹点数量) * 100
    // 这种计算方式能够直观地反映出超出圆圈的程度，超出的越多，错误率越大
    const errorRate = (totalAreaError / pathPoints.length) * 100;
    
    return errorRate;
}


// 更新界面信息和绘制动态内容
function updateInfo(gamepad) {
    // 清除画布，以便重新绘制所有元素
    ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
    ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
        // 绘制静态背景（圆圈和十字线）
    drawStaticBackground(ctxLeft);
    drawStaticBackground(ctxRight);
    if (gamepad) {
        // 左摇杆
        const leftX = gamepad.axes[0] ? gamepad.axes[0].toFixed(2) : '0.00';
        const leftY = gamepad.axes[1] ? gamepad.axes[1].toFixed(2) : '0.00';
        
        // 仅当左摇杆移动时才记录
        if (Math.abs(leftX) > 0.05 || Math.abs(leftY) > 0.05) {
            pathPointsLeft.push({x: parseFloat(leftX), y: parseFloat(leftY)});
        }
        
        // 右摇杆
        const rightX = gamepad.axes[2] ? gamepad.axes[2].toFixed(2) : '0.00';
        const rightY = gamepad.axes[3] ? gamepad.axes[3].toFixed(2) : '0.00';
        
        // 仅当右摇杆移动时才记录
        if (Math.abs(rightX) > 0.05 || Math.abs(rightY) > 0.05) {
            pathPointsRight.push({x: parseFloat(rightX), y: parseFloat(rightY)});
        }
        
        // 更新左摇杆信息
        document.getElementById('left-x').innerText = leftX;
        document.getElementById('left-y').innerText = leftY;
        document.getElementById('left-radius').innerText = Math.sqrt(leftX * leftX + leftY * leftY).toFixed(2);
        document.getElementById('left-error').innerText = calculateErrorRate(pathPointsLeft).toFixed(2) + '%';
        
        // 更新右摇杆信息
        document.getElementById('right-x').innerText = rightX;
        document.getElementById('right-y').innerText = rightY;
        document.getElementById('right-radius').innerText = Math.sqrt(rightX * rightX + rightY * rightY).toFixed(2);
        document.getElementById('right-error').innerText = calculateErrorRate(pathPointsRight).toFixed(2) + '%';

    } else {
        document.getElementById('left-x').innerText = '0.00';
        document.getElementById('left-y').innerText = '0.00';
        document.getElementById('left-radius').innerText = '0.00';
        document.getElementById('left-error').innerText = '0.00%';
        document.getElementById('right-x').innerText = '0.00';
        document.getElementById('right-y').innerText = '0.00';
        document.getElementById('right-radius').innerText = '0.00';
        document.getElementById('right-error').innerText = '0.00%';
        
        // 手柄断开时，绘制中心红点
        drawRedDot(ctxLeft, 0, 0);
        drawRedDot(ctxRight, 0, 0);
        return;
    }

    // 绘制所有存储的左摇杆轨迹点
    pathPointsLeft.forEach(point => {
        drawPath(ctxLeft, point.x, point.y);
    });

    // 绘制所有存储的右摇杆轨迹点
    pathPointsRight.forEach(point => {
        drawPath(ctxRight, point.x, point.y);
    });

    // 重新绘制静态背景 (确保圆圈和十字线在轨迹之上)
    drawStaticBackground(ctxLeft);
    drawStaticBackground(ctxRight);

    // 绘制中心红点，始终在最上层
    drawRedDot(ctxLeft, gamepad.axes[0] || 0, gamepad.axes[1] || 0);
    drawRedDot(ctxRight, gamepad.axes[2] || 0, gamepad.axes[3] || 0);
}

// 游戏循环
function gameLoop() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[selectedGamepadIndex];
    updateInfo(gamepad);

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 处理手柄连接
window.addEventListener("gamepadconnected", (event) => {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        event.gamepad.index, event.gamepad.id,
        event.gamepad.buttons.length, event.gamepad.axes.length);
    updateGamepadList();
    if (!animationFrameId) {
        gameLoop();
    }
});

// 处理手柄断开
window.addEventListener("gamepaddisconnected", (event) => {
    console.log("Gamepad disconnected from index %d: %s",
        event.gamepad.index, event.gamepad.id);
    updateGamepadList();
    if (navigator.getGamepads().every(gp => gp === null)) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        pathPointsLeft = []; // 清空轨迹
        pathPointsRight = []; // 清空轨迹
        ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
        drawStaticBackground(ctxLeft);
        drawStaticBackground(ctxRight);
        updateInfo(null);
    }
});

// 更新下拉菜单
function updateGamepadList() {
    selectElement.innerHTML = '';
    const gamepads = navigator.getGamepads();
    gamepads.forEach((gamepad, index) => {
        if (gamepad) {
            const option = document.createElement('option');
            option.value = index;
            option.text = gamepad.id;
            selectElement.appendChild(option);
        }
    });

    if (selectElement.options.length > 0) {
        selectElement.selectedIndex = selectedGamepadIndex;
    }
}

// 切换手柄
selectElement.addEventListener('change', (event) => {
    selectedGamepadIndex = event.target.value;
    pathPointsLeft = []; // 切换手柄时清空轨迹
    pathPointsRight = []; // 切换手柄时清空轨迹
});

// 初始绘制
drawStaticBackground(ctxLeft);
drawStaticBackground(ctxRight);
updateGamepadList();
// 确保页面加载时立即开始游戏循环，以显示初始状态
gameLoop();