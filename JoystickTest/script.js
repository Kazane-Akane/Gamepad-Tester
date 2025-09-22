const canvasLeft = document.getElementById('joystick-canvas-left');
const ctxLeft = canvasLeft.getContext('2d');
const canvasRight = document.getElementById('joystick-canvas-right');
const ctxRight = canvasRight.getContext('2d');
const selectElement = document.getElementById('gamepad-select');

let selectedGamepadIndex = 0;
let animationFrameId = null;
let pathPointsLeft = []; // ���ڴ洢��ҡ�˹켣�������
let pathPointsRight = []; // ���ڴ洢��ҡ�˹켣�������

// ���ƾ�̬������ԲȦ��ʮ���ߣ�
function drawStaticBackground(ctx) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = 150;

    // ���Ʊ�׼Բ
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ����ʮ����
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, ctx.canvas.height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(ctx.canvas.width, centerY);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ���Ƶ����켣���λ�����
function drawPath(ctx, x, y) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = 150;
    const scale = 150;

    const angle = Math.atan2(y, x);
    const distance = Math.sqrt(Math.pow(x * scale, 2) + Math.pow(y * scale, 2));
    
    // �������λ��Ƶ���ʼ�ͽ����Ƕȣ�������״Ч��
    const startAngle = angle - 0.1; // ������ֵ�Ըı����ο��
    const endAngle = angle + 0.1;

    // ������ɫ���ι켣 (ʼ�ջ��Ƶ�ԲȦ��)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    // ���ΰ뾶ȡҡ�˾����ԲȦ�뾶�е���Сֵ��ȷ����ɫ���ֲ��ᳬ��ԲȦ
    const sectorRadius = Math.min(distance, radius);
    ctx.arc(centerX, centerY, sectorRadius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 123, 255, 1)'; // ͸���ȵ���Ϊ100%
    ctx.fill();

    // ���ҡ�˳���ԲȦ�����ƺ�ɫ����
    if (distance > radius) {
        // �����ɫ�켣���ĸ����㣬�γ�һ���ı���
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
        ctx.fillStyle = 'rgba(255, 0, 0, 1)'; // ͸���ȵ���Ϊ100%
        ctx.fill();
    }
}

// �������ĺ��
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
 * ���ݹ켣�㳬��ԲȦ�����������������ʡ�
 * @param {Array<Object>} pathPoints - �켣�����飬ÿ�������x��y���ꡣ
 * @returns {number} �����ʰٷֱȡ�
 */
function calculateErrorRate(pathPoints) {
    if (pathPoints.length < 20) { // ��Ҫ����20����������ȶ���ͳ������
        return 0;
    }

    let totalAreaError = 0;
    // ҡ�˵��������뾶Ϊ1.0
    const idealRadius = 1.0; 

    // ����ÿ���㳬��ԲȦ�ġ������
    pathPoints.forEach(point => {
        const radius = Math.sqrt(point.x * point.x + point.y * point.y);
        // ֻ���㳬������뾶�Ĳ���
        const areaError = Math.max(0, radius - idealRadius); 
        totalAreaError += areaError;
    });

    // ������ = (�ܳ������ / �켣������) * 100
    // ���ּ��㷽ʽ�ܹ�ֱ�۵ط�ӳ������ԲȦ�ĳ̶ȣ�������Խ�࣬������Խ��
    const errorRate = (totalAreaError / pathPoints.length) * 100;
    
    return errorRate;
}


// ���½�����Ϣ�ͻ��ƶ�̬����
function updateInfo(gamepad) {
    // ����������Ա����»�������Ԫ��
    ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
    ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
        // ���ƾ�̬������ԲȦ��ʮ���ߣ�
    drawStaticBackground(ctxLeft);
    drawStaticBackground(ctxRight);
    if (gamepad) {
        // ��ҡ��
        const leftX = gamepad.axes[0] ? gamepad.axes[0].toFixed(2) : '0.00';
        const leftY = gamepad.axes[1] ? gamepad.axes[1].toFixed(2) : '0.00';
        
        // ������ҡ���ƶ�ʱ�ż�¼
        if (Math.abs(leftX) > 0.05 || Math.abs(leftY) > 0.05) {
            pathPointsLeft.push({x: parseFloat(leftX), y: parseFloat(leftY)});
        }
        
        // ��ҡ��
        const rightX = gamepad.axes[2] ? gamepad.axes[2].toFixed(2) : '0.00';
        const rightY = gamepad.axes[3] ? gamepad.axes[3].toFixed(2) : '0.00';
        
        // ������ҡ���ƶ�ʱ�ż�¼
        if (Math.abs(rightX) > 0.05 || Math.abs(rightY) > 0.05) {
            pathPointsRight.push({x: parseFloat(rightX), y: parseFloat(rightY)});
        }
        
        // ������ҡ����Ϣ
        document.getElementById('left-x').innerText = leftX;
        document.getElementById('left-y').innerText = leftY;
        document.getElementById('left-radius').innerText = Math.sqrt(leftX * leftX + leftY * leftY).toFixed(2);
        document.getElementById('left-error').innerText = calculateErrorRate(pathPointsLeft).toFixed(2) + '%';
        
        // ������ҡ����Ϣ
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
        
        // �ֱ��Ͽ�ʱ���������ĺ��
        drawRedDot(ctxLeft, 0, 0);
        drawRedDot(ctxRight, 0, 0);
        return;
    }

    // �������д洢����ҡ�˹켣��
    pathPointsLeft.forEach(point => {
        drawPath(ctxLeft, point.x, point.y);
    });

    // �������д洢����ҡ�˹켣��
    pathPointsRight.forEach(point => {
        drawPath(ctxRight, point.x, point.y);
    });

    // ���»��ƾ�̬���� (ȷ��ԲȦ��ʮ�����ڹ켣֮��)
    drawStaticBackground(ctxLeft);
    drawStaticBackground(ctxRight);

    // �������ĺ�㣬ʼ�������ϲ�
    drawRedDot(ctxLeft, gamepad.axes[0] || 0, gamepad.axes[1] || 0);
    drawRedDot(ctxRight, gamepad.axes[2] || 0, gamepad.axes[3] || 0);
}

// ��Ϸѭ��
function gameLoop() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[selectedGamepadIndex];
    updateInfo(gamepad);

    animationFrameId = requestAnimationFrame(gameLoop);
}

// �����ֱ�����
window.addEventListener("gamepadconnected", (event) => {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        event.gamepad.index, event.gamepad.id,
        event.gamepad.buttons.length, event.gamepad.axes.length);
    updateGamepadList();
    if (!animationFrameId) {
        gameLoop();
    }
});

// �����ֱ��Ͽ�
window.addEventListener("gamepaddisconnected", (event) => {
    console.log("Gamepad disconnected from index %d: %s",
        event.gamepad.index, event.gamepad.id);
    updateGamepadList();
    if (navigator.getGamepads().every(gp => gp === null)) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        pathPointsLeft = []; // ��չ켣
        pathPointsRight = []; // ��չ켣
        ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
        drawStaticBackground(ctxLeft);
        drawStaticBackground(ctxRight);
        updateInfo(null);
    }
});

// ���������˵�
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

// �л��ֱ�
selectElement.addEventListener('change', (event) => {
    selectedGamepadIndex = event.target.value;
    pathPointsLeft = []; // �л��ֱ�ʱ��չ켣
    pathPointsRight = []; // �л��ֱ�ʱ��չ켣
});

// ��ʼ����
drawStaticBackground(ctxLeft);
drawStaticBackground(ctxRight);
updateGamepadList();
// ȷ��ҳ�����ʱ������ʼ��Ϸѭ��������ʾ��ʼ״̬
gameLoop();