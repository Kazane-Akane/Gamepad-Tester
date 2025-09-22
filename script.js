// 游戏手柄按钮与SVG元素ID的映射关系
// 注意：不同手柄（如PS4, Xbox, Switch Pro）的按钮索引可能不同。
// 这里的映射是基于标准XInput（Xbox）布局。
const buttonMap = {
    '0': 'BBottom', // A
    '1': 'BRight',  // B
    '2': 'BLeft',   // X
    '3': 'BTop',    // Y
    '4': 'L1',      // L1
    '5': 'R1',      // R1
    '6': 'L2',      // L2 Trigger
    '7': 'R2',      // R2 Trigger
    '8': 'LMeta',   // Back/View
    '9': 'RMeta',   // Start/Menu
    '10': 'LStickOutline', // L3
    '11': 'RStickOutline', // R3
    '12': 'DUp',    // D-pad Up
    '13': 'DDown',  // D-pad Down
    '14': 'DLeft',  // D-pad Left
    '15': 'DRihgt', // D-pad Right
};

const axisMap = {
    '0': 'LeftStick',  // 左摇杆X轴
    '1': 'LeftStick',  // 左摇杆Y轴
    '2': 'RightStick', // 右摇杆X轴
    '3': 'RightStick', // 右摇杆Y轴
};

const stickCenterLeft = { x: 112.6, y: 160.4 };
const stickCenterRight = { x: 278, y: 238 };
const stickRadius = 15; // 摇杆可移动的半径

// 修改：将 pollingInterval 更改为用于 requestAnimationFrame 的变量
let pollingInterval = null;
let currentGamepadIndex = null;
let lastActiveGamepadIndex = null; // 新增：保存上一个活跃手柄的索引
let currentProtocol = 'XInput'; // 新增：保存当前手柄的协议类型

// 获取 DOM 元素
const deviceTabsContainer = document.getElementById('device-tabs-container');
const gamepadStatusEl = document.getElementById('gamepad-status');
const L2ProgressEl = document.getElementById('L2-progress');
const R2ProgressEl = document.getElementById('R2-progress');
const L2ValueEl = document.getElementById('L2-value');
const R2ValueEl = document.getElementById('R2-value');
const leftStickValueEl = document.getElementById('left-stick-value');
const rightStickValueEl = document.getElementById('right-stick-value');
const pollingRateValueEl = document.getElementById('polling-rate-value');

// 新增：左右震动按钮
const vibrateButtonL = document.querySelector('.vibrate-button-L');
const vibrateButtonR = document.querySelector('.vibrate-button-R');

// 新增：震动滑块和值
// 修改：移除强弱震动滑块，只保留一个震动强度滑块
const rumbleInputL = document.getElementById('rumble-L');
const rumbleValueElL = document.getElementById('rumble-value-L');

const rumbleInputR = document.getElementById('rumble-R');
const rumbleValueElR = document.getElementById('rumble-value-R');

const durationInputL = document.getElementById('duration-L');
const durationInputR = document.getElementById('duration-R');


// 新增：右侧摇杆图表的元素
const leftStickVisualEl = document.getElementById('left-stick-visual');
const rightStickVisualEl = document.getElementById('right-stick-visual');
const visualStickRadius = 40; // 新摇杆图表的半径
const leftStickLineEl = document.getElementById('left-stick-line');
const rightStickLineEl = document.getElementById('right-stick-line');


// 轮询率测试变量
// 修改：使用 lastPollTime 来计算两次数据更新之间的时间
let lastPollTime = performance.now();
// 修复BUG: 摇杆值不再使用 toFixed(2)
let lastLeftX = 0;
let lastLeftY = 0;
let lastRightX = 0;
let lastRightY = 0;
// 修复BUG: 新增用于跟踪手柄时间戳的变量
let lastGamepadTimestamp = 0;


// 新增：轮询率测试弹窗相关的变量和元素
// BUG 修复: 声明全局变量以供 close 按钮访问
let countdownInterval = null;
let pollingRateTestInterval = null;
let pollingRateRecords = [];
let testRecordCount = 0; // 新增：记录当前采样数
let testStartTime = 0; // 新增：记录测试开始时间

// 新增：串键测试相关的变量
let crosstalkTestState = false; // 是否正在进行串键测试
let crosstalkTestRecords = []; // 记录按键序列
let crosstalkTargetCount = 0; // 目标测试次数
let crosstalkCurrentCount = 0; // 当前按键次数
let crosstalkTargetDirection = 'up-down'; // 'up-down' 或 'left-right'
let lastDpadButton = null; // 上一个按下的D-pad键
let lastDpadTimestamp = 0; // 上一次按键的时间戳

// 新增Dinput相关元素
const mainContent = document.querySelector('.main-content');
let dinputUI = null;
let xinputUI = null;

// 新增：创建Dinput UI
function createDinputUI() {
    const dinputContainer = document.createElement('div');
    dinputContainer.id = 'dinput-container';
    // 修改：移除 dinput-area 类，避免影响父布局
    dinputContainer.classList.add('test-area', 'test-area-centered');
    dinputContainer.style.display = 'none';

    // 重新设计布局，并新增一个包裹容器
    dinputContainer.innerHTML = `
        <div class="dinput-sections-wrapper">
            <div class="test-section">
                <h3>按键状态 (DInput)</h3>
                <div id="dinput-button-grid" class="button-grid"></div>
            </div>
            <div class="test-section">
                <h3>摇杆/轴值 (DInput)</h3>
                <div id="dinput-axis-list" class="stick-values"></div>
            </div>
            <div class="test-section full-width">
                <h3>震动测试 (DInput)</h3>
                <div class="vibration-controls">
                    <div class="vibration-left">
                        <h4>左震动 (强震)</h4>
                        <div class="vibration-group">
                            <label for="dinput-rumble-L">强度 (0-1):</label>
                            <input type="range" id="dinput-rumble-L" min="0" max="1" step="0.1" value="1">
                            <span id="dinput-rumble-value-L">1.0</span>
                        </div>
                        <div class="vibration-group">
                            <label for="dinput-duration-L">时间 (ms):</label>
                            <input type="number" id="dinput-duration-L" value="2000" min="0">
                        </div>
                        <button class="vibrate-button-L dinput-vibrate-L">左震动</button>
                    </div>
                    <div class="vibration-right">
                        <h4>右震动 (弱震)</h4>
                        <div class="vibration-group">
                            <label for="dinput-rumble-R">强度 (0-1):</label>
                            <input type="range" id="dinput-rumble-R" min="0" max="1" step="0.1" value="1">
                            <span id="dinput-rumble-value-R">1.0</span>
                        </div>
                        <div class="vibration-group">
                            <label for="dinput-duration-R">时间 (ms):</label>
                            <input type="number" id="dinput-duration-R" value="2000" min="0">
                        </div>
                        <button class="vibrate-button-R dinput-vibrate-R">右震动</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    mainContent.appendChild(dinputContainer);
    dinputUI = dinputContainer;

    // 绑定Dinput震动按钮事件
    const vibrateButtonDL = dinputUI.querySelector('.dinput-vibrate-L');
    const vibrateButtonDR = dinputUI.querySelector('.dinput-vibrate-R');
    const rumbleInputDL = dinputUI.querySelector('#dinput-rumble-L');
    const rumbleInputDR = dinputUI.querySelector('#dinput-rumble-R');
    const durationInputDL = dinputUI.querySelector('#dinput-duration-L');
    const durationInputDR = dinputUI.querySelector('#dinput-duration-R');
    const rumbleValueDL = dinputUI.querySelector('#dinput-rumble-value-L');
    const rumbleValueDR = dinputUI.querySelector('#dinput-rumble-value-R');

    if (vibrateButtonDL) {
        vibrateButtonDL.addEventListener('click', () => {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[currentGamepadIndex];
            if (gamepad && gamepad.vibrationActuator) {
                const rumble = Math.round(parseFloat(rumbleInputDL.value) * 10) / 10;
                const duration = parseInt(durationInputDL.value, 10);
                gamepad.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: 0,
                    strongMagnitude: rumble,
                });
            } else {
                alert('当前手柄不支持震动功能或未连接。');
            }
        });
    }

    if (vibrateButtonDR) {
        vibrateButtonDR.addEventListener('click', () => {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[currentGamepadIndex];
            if (gamepad && gamepad.vibrationActuator) {
                const rumble = Math.round(parseFloat(rumbleInputDR.value) * 10) / 10;
                const duration = parseInt(durationInputDR.value, 10);
                gamepad.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: rumble,
                    strongMagnitude: 0,
                });
            } else {
                alert('当前手柄不支持震动功能或未连接。');
            }
        });
    }

    if (rumbleInputDL) {
        rumbleInputDL.addEventListener('input', () => {
            const value = Math.round(parseFloat(rumbleInputDL.value) * 10) / 10;
            if (rumbleValueDL) rumbleValueDL.textContent = value.toFixed(1);
        });
    }

    if (rumbleInputDR) {
        rumbleInputDR.addEventListener('input', () => {
            const value = Math.round(parseFloat(rumbleInputDR.value) * 10) / 10;
            if (rumbleValueDR) rumbleValueDR.textContent = value.toFixed(1);
        });
    }
}


// 新增：更新设备选项卡
function updateDeviceTabs() {
    const gamepads = navigator.getGamepads();
    deviceTabsContainer.innerHTML = ''; // 清空现有选项卡
    gamepads.forEach((gamepad, index) => {
        if (gamepad) {
            const button = document.createElement('button');
            button.classList.add('tab-button');
            // 修改了这行代码，使用 innerHTML 并添加 <br> 来换行
          currentProtocol = detectGamepadProtocol(gamepad);
            button.innerHTML = `手柄 ${index}  <br> [${currentProtocol}] ${gamepad.id}`; 
            button.onclick = () => {
                currentGamepadIndex = index;
                // 新增：保存上一个活跃手柄的索引
                lastActiveGamepadIndex = index;
                updateDeviceTabs(); // 重新渲染以更新激活状态
                
                // 新增：切换协议UI
                currentProtocol = detectGamepadProtocol(gamepad);
                toggleUI();
            };
            if (index === currentGamepadIndex) {
                button.classList.add('active');
            }
            deviceTabsContainer.appendChild(button);
        }
    });
}

// 新增：协议检测函数
function detectGamepadProtocol(gamepad) {
    // D-Input 手柄通常只有17个或更少的按钮，并且轴和按钮的映射可能不一致
    // X-Input 手柄通常有16个按钮，并且映射标准化
    // 此处通过 buttons.length 和 id 来初步判断
    if (gamepad.id.toLowerCase().includes('xbox') || gamepad.buttons.length >= 16) {
        return 'XInput';
    } else {
        return 'DInput';
    }
}

// 新增：切换 UI 函数
function toggleUI() {
    if (!xinputUI) {
        xinputUI = document.querySelector('.main-content > .gamepad-svg-container');
    }
    if (!dinputUI) {
        createDinputUI();
    }
    
    // 修改：根据协议类型隐藏或显示对应的 UI
    if (currentProtocol === 'XInput') {
        xinputUI.style.display = 'flex';
        dinputUI.style.display = 'none';
        // 确保 X-input 的 test-area 正常显示
        const xinputTestArea = document.querySelector('.main-content > .test-area');
        if (xinputTestArea) {
             xinputTestArea.style.display = 'block';
             // 确保两栏布局正确
             xinputTestArea.style.width = '';
        }
    } else {
        // 修改：当切换到Dinput时，隐藏Xinput的SVG部分
        xinputUI.style.display = 'none';
        dinputUI.style.display = 'block';
        // 新增代码：隐藏左边的test-area容器
        const xinputTestArea = document.querySelector('.main-content > .test-area');
        if (xinputTestArea) {
            xinputTestArea.style.display = 'none';
        }
        // 确保Dinput的test-area居中显示，并且没有两栏布局
        const dinputTestArea = dinputUI;
        if (dinputTestArea) {
            dinputTestArea.style.width = '100%';
            dinputTestArea.style.maxWidth = '600px';
        }
        
    }
}

// 游戏循环：不断更新手柄状态
function updateStatus() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[currentGamepadIndex];
    const now = performance.now();
     // 新增：如果正在进行串键测试，则进入串键测试逻辑
if (crosstalkTestState && gamepad) {
        const dpadUp = gamepad.buttons[12];
        const dpadDown = gamepad.buttons[13];
        const dpadLeft = gamepad.buttons[14];
        const dpadRight = gamepad.buttons[15];

        let buttonPressDetected = false;
        let mainPressedButton = null;
        let crosstalkButtons = [];

        // 检查上下键测试
        if (crosstalkTargetDirection === 'up-down') {
            if (dpadUp.pressed) mainPressedButton = 'up';
            if (dpadDown.pressed) mainPressedButton = 'down';

            if (mainPressedButton) {
                buttonPressDetected = true;
                if (lastDpadButton !== mainPressedButton) {
                    // 检查串键
                    if (dpadUp.pressed && dpadDown.pressed) crosstalkButtons.push('up', 'down');
                    if (dpadUp.pressed && (dpadLeft.pressed || dpadRight.pressed)) crosstalkButtons.push(dpadLeft.pressed ? 'left' : 'right');
                    if (dpadDown.pressed && (dpadLeft.pressed || dpadRight.pressed)) crosstalkButtons.push(dpadLeft.pressed ? 'left' : 'right');

                    // 记录按键事件
                    if (crosstalkCurrentCount < crosstalkTargetCount) {
                        crosstalkCurrentCount++;
                        crosstalkTestRecords.push({
                            type: mainPressedButton,
                            crosstalkedWith: Array.from(new Set(crosstalkButtons)), // 去重
                            timestamp: now
                        });
                        lastDpadButton = mainPressedButton;
                        updateCrosstalkUI();
                    } else {
                        stopCrosstalkTest();
                    }
                }
            }
        }
        
        // 检查左右键测试
        else if (crosstalkTargetDirection === 'left-right') {
            if (dpadLeft.pressed) mainPressedButton = 'left';
            if (dpadRight.pressed) mainPressedButton = 'right';

            if (mainPressedButton) {
                buttonPressDetected = true;
                if (lastDpadButton !== mainPressedButton) {
                    // 检查串键
                    if (dpadLeft.pressed && dpadRight.pressed) crosstalkButtons.push('left', 'right');
                    if (dpadLeft.pressed && (dpadUp.pressed || dpadDown.pressed)) crosstalkButtons.push(dpadUp.pressed ? 'up' : 'down');
                    if (dpadRight.pressed && (dpadUp.pressed || dpadDown.pressed)) crosstalkButtons.push(dpadUp.pressed ? 'up' : 'down');

                    // 记录按键事件
                    if (crosstalkCurrentCount < crosstalkTargetCount) {
                        crosstalkCurrentCount++;
                        crosstalkTestRecords.push({
                            type: mainPressedButton,
                            crosstalkedWith: Array.from(new Set(crosstalkButtons)), // 去重
                            timestamp: now
                        });
                        lastDpadButton = mainPressedButton;
                        updateCrosstalkUI();
                    } else {
                        stopCrosstalkTest();
                    }
                }
            }
        }
        
        // 如果本次循环没有检测到任何按键，则重置 lastDpadButton
        if (!dpadUp.pressed && !dpadDown.pressed && !dpadLeft.pressed && !dpadRight.pressed) {
            lastDpadButton = null;
        }

        // 串键测试模式下不执行常规UI更新
        return;
    }
    // 新增：检查所有手柄的按钮和摇杆状态，以便在有按键按下时切换激活手柄
    gamepads.forEach((g, index) => {
        if (g) {
            let isActive = false;
            // 检查按钮
            for (let i = 0; i < g.buttons.length; i++) {
                if (g.buttons[i].pressed || g.buttons[i].value > 0.1) {
                    isActive = true;
                    break;
                }
            }
            // 检查摇杆
            if (!isActive) {
                for (let i = 0; i < g.axes.length; i++) {
                    if (Math.abs(g.axes[i]) > 0.1) {
                        isActive = true;
                        break;
                    }
                }
            }
            
            // 修复：如果手柄有活动但不是当前手柄，则高亮提示
            const tabButton = deviceTabsContainer.querySelector(`.tab-button:nth-child(${index + 1})`);
            if (isActive && currentGamepadIndex !== index) {
                if (tabButton) tabButton.classList.add('active-button-prompt');
            } else {
                if (tabButton) tabButton.classList.remove('active-button-prompt');
            }
        }
    });

    // 如果当前选择的手柄不存在，则显示未连接状态
    if (!gamepad) {
        if (gamepadStatusEl) gamepadStatusEl.textContent = '当前手柄未连接';
        if (leftStickValueEl) leftStickValueEl.textContent = '(0.00, 0.00)';
        if (rightStickValueEl) rightStickValueEl.textContent = '(0.00, 0.00)';
        if (L2ProgressEl) L2ProgressEl.value = 0;
        if (R2ProgressEl) R2ProgressEl.value = 0;
        if (L2ValueEl) L2ValueEl.textContent = '0';
        if (R2ValueEl) R2ValueEl.textContent = '0';
        if (leftStickVisualEl) {
            leftStickVisualEl.setAttribute('cx', 50);
            leftStickVisualEl.setAttribute('cy', 50);
        }
        if (rightStickVisualEl) {
            rightStickVisualEl.setAttribute('cx', 50);
            rightStickVisualEl.setAttribute('cy', 50);
        }
        if (leftStickLineEl) leftStickLineEl.style.display = 'none';
        if (rightStickLineEl) rightStickLineEl.style.display = 'none';

        // 重置所有状态
        Object.values(buttonMap).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('active-button');
                if (id === 'L2' || id === 'R2') {
                    element.style.fill = 'rgba(9, 105, 150, 0)';
                }
            }
        });
        const leftStick = document.getElementById('LeftStick');
        const rightStick = document.getElementById('RightStick');
        if (leftStick) leftStick.classList.remove('active-stick');
        if (rightStick) rightStick.classList.remove('active-stick');
        for (let i = 0; i < 16; i++) {
            const buttonIndicator = document.getElementById(`button-${i}`);
            if (buttonIndicator) {
                buttonIndicator.classList.remove('active-button');
                if (i === 6 || i === 7) {
                    buttonIndicator.style.backgroundColor = '';
                    buttonIndicator.style.borderColor = '';
                }
            }
        }
        return; // 退出函数
    } else {
        if (gamepadStatusEl) gamepadStatusEl.textContent = `已连接：${gamepad.id}`;

        if (currentProtocol === 'XInput') {
            // 更新按钮状态
            gamepad.buttons.forEach((button, index) => {
                const buttonId = buttonMap[index];
                if (buttonId) {
                    const element = document.getElementById(buttonId);
                    // 更新左侧SVG上的按钮状态
                    if (button.pressed || button.value > 0.1) {
                        if (element) {
                            if (buttonId === 'L2' || buttonId === 'R2') {
                                element.style.fill = `rgba(9, 105, 150, ${button.value})`;
                            } else {
                                element.classList.add('active-button');
                            }
                        }
                    } else {
                        if (element) {
                            element.classList.remove('active-button');
                            if (buttonId === 'L2' || buttonId === 'R2') {
                                element.style.fill = 'rgba(9, 105, 150, 0)';
                            }
                        }
                    }

                    // 更新右侧按钮UI上的指示灯状态
                    const buttonIndicator = document.getElementById(`button-${index}`);
                    if (buttonIndicator) {
                        if (index === 6 || index === 7) { // LT 和 RT 的特殊处理
                            const value = button.value;
                            const opacity = value * 0.8 + 0.2;
                            const color = `rgba(46, 204, 113, ${opacity})`;
                            const borderColor = `rgba(39, 174, 96, ${opacity})`;
                            buttonIndicator.style.backgroundColor = color;
                            buttonIndicator.style.borderColor = borderColor;
                        } else if (button.pressed || button.value > 0.1) {
                            buttonIndicator.classList.add('active-button');
                        } else {
                            buttonIndicator.classList.remove('active-button');
                            if (index === 6 || index === 7) {
                                buttonIndicator.style.backgroundColor = '';
                                buttonIndicator.style.borderColor = '';
                            }
                        }
                    }
                }
            });

            // 更新摇杆状态
            // 修复BUG: 移除 toFixed(2) 以保留完整的浮点数精度
            const leftX = gamepad.axes[0] || 0;
            const leftY = gamepad.axes[1] || 0;
            const rightX = gamepad.axes[2] || 0;
            const rightY = gamepad.axes[3] || 0;

            // 更新主SVG中的摇杆位置
            const leftStick = document.getElementById('LeftStick');
            const rightStick = document.getElementById('RightStick');
            if (leftStick) {
                leftStick.setAttribute('cx', stickCenterLeft.x + leftX * stickRadius);
                leftStick.setAttribute('cy', stickCenterLeft.y + leftY * stickRadius);
            }
            if (rightStick) {
                rightStick.setAttribute('cx', stickCenterRight.x + rightX * stickRadius);
                rightStick.setAttribute('cy', stickCenterRight.y + rightY * stickRadius);
            }

            // 更新摇杆描边颜色
            if (leftStick && (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1)) {
                leftStick.classList.add('active-stick');
            } else {
                if (leftStick) leftStick.classList.remove('active-stick');
            }
            if (rightStick && (Math.abs(rightX) > 0.1 || Math.abs(rightY) > 0.1)) {
                rightStick.classList.add('active-stick');
            } else {
                if (rightStick) rightStick.classList.remove('active-stick');
            }

            // 更新右侧摇杆值和视觉图
            // 在显示时再进行格式化
            if (leftStickValueEl) leftStickValueEl.textContent = `(${leftX.toFixed(2)}, ${leftY.toFixed(2)})`;
            if (rightStickValueEl) rightStickValueEl.textContent = `(${rightX.toFixed(2)}, ${rightY.toFixed(2)})`;

            const newLeftX = 50 + leftX * visualStickRadius;
            const newLeftY = 50 + leftY * visualStickRadius;
            const newRightX = 50 + rightX * visualStickRadius;
            const newRightY = 50 + rightY * visualStickRadius;

            if (leftStickVisualEl) {
                leftStickVisualEl.setAttribute('cx', newLeftX);
                leftStickVisualEl.setAttribute('cy', newLeftY);
            }
            if (rightStickVisualEl) {
                rightStickVisualEl.setAttribute('cx', newRightX);
                rightStickVisualEl.setAttribute('cy', newRightY);
            }

            // 新增：更新线条位置
            if (leftStickLineEl) {
                if (Math.abs(leftX) > 0.05 || Math.abs(leftY) > 0.05) {
                    leftStickLineEl.style.display = 'block';
                    leftStickLineEl.setAttribute('x2', newLeftX);
                    leftStickLineEl.setAttribute('y2', newLeftY);
                } else {
                    leftStickLineEl.style.display = 'none';
                }
            }
            if (rightStickLineEl) {
                if (Math.abs(rightX) > 0.05 || Math.abs(rightY) > 0.05) {
                    rightStickLineEl.style.display = 'block';
                    rightStickLineEl.setAttribute('x2', newRightX);
                    rightStickLineEl.setAttribute('y2', newRightY);
                } else {
                    rightStickLineEl.style.display = 'none';
                }
            }

            // 更新扳机进度条和值
            const l2Value = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
            const r2Value = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
            if (L2ProgressEl) L2ProgressEl.value = Math.round(l2Value * 255);
            if (R2ProgressEl) R2ProgressEl.value = Math.round(r2Value * 255);
            if (L2ValueEl) L2ValueEl.textContent = Math.round(l2Value * 255);
            if (R2ValueEl) R2ValueEl.textContent = Math.round(r2Value * 255);

        } else { // DInput
            // 更新Dinput UI
            const dinputButtonGrid = dinputUI.querySelector('#dinput-button-grid');
            const dinputAxisList = dinputUI.querySelector('#dinput-axis-list');
            
            // 首次渲染时创建元素
            if (dinputButtonGrid.childElementCount === 0) {
                // 修改：使用固定循环来创建16个按键元素
                for (let i = 0; i < 16; i++) {
                    const buttonItem = document.createElement('div');
                    buttonItem.classList.add('button-item');
                    buttonItem.innerHTML = `<span class="label">按键 ${i}:</span><span id="dbutton-${i}" class="button-indicator"></span>`;
                    dinputButtonGrid.appendChild(buttonItem);
                }
            }
            

            if (dinputAxisList.childElementCount === 0) {
                gamepad.axes.forEach((_, index) => {
                    const axisItem = document.createElement('div');
                    // 修改：添加新的类名用于样式控制
                    axisItem.classList.add('axis-item-container');
                    axisItem.innerHTML = `<span class="label">轴 ${index}:</span><span id="daxis-${index}" class="axis-value-indicator">0.00</span>`;
                    dinputAxisList.appendChild(axisItem);
                });
            }


            // 更新按键状态
            gamepad.buttons.forEach((button, index) => {
                const buttonIndicator = document.getElementById(`dbutton-${index}`);
                if (buttonIndicator) {
                    if (button.pressed || button.value > 0.1) {
                        buttonIndicator.classList.add('active-button');
                    } else {
                        buttonIndicator.classList.remove('active-button');
                    }
                }
            });

            // 更新摇杆/轴值
            gamepad.axes.forEach((axisValue, index) => {
                const axisEl = document.getElementById(`daxis-${index}`);
                if (axisEl) {
                    axisEl.textContent = axisValue.toFixed(2);
                }
            });
        }

        // 修复BUG: 轮询率计算现在基于 gamepad.timestamp 的变化
        // 核心：使用 gamepad.timestamp 来测量两次数据更新之间的时间。
        // 这是比简单地轮询 requestAnimationFrame 更可靠的测量方法，
        // 因为它直接反映了手柄硬件数据更新的频率。
        if (gamepad.timestamp !== lastGamepadTimestamp) {
            const delta = now - lastPollTime;
            if (delta > 0) {
                const rate = Math.round(1000 / delta);
                if (pollingRateValueEl) {
                    pollingRateValueEl.textContent = rate;
                }
            }
            lastPollTime = now;
            lastGamepadTimestamp = gamepad.timestamp;
            lastLeftX = gamepad.axes[0] || 0;
            lastLeftY = gamepad.axes[1] || 0;
            lastRightX = gamepad.axes[2] || 0;
            lastRightY = gamepad.axes[3] || 0;
        }
    }
}

// 修改: 使用 requestAnimationFrame 递归调用来代替 setInterval
function mainPollingLoop() {
    updateStatus();
    pollingInterval = requestAnimationFrame(mainPollingLoop);
}

// 监听手柄连接和断开事件
window.addEventListener("gamepadconnected", (e) => {
    console.log(`手柄 ${e.gamepad.index} 连接：${e.gamepad.id}`);
    if (currentGamepadIndex === null) {
        currentGamepadIndex = e.gamepad.index;
        lastActiveGamepadIndex = e.gamepad.index; // 首次连接时保存
    }
    updateDeviceTabs(); // 更新选项卡
    
    // 首次连接时检测协议并切换UI
    const gamepads = navigator.getGamepads();
    currentProtocol = detectGamepadProtocol(gamepads[currentGamepadIndex]);
    toggleUI();
    
    if (!pollingInterval) {
        lastPollTime = performance.now();
        lastGamepadTimestamp = 0;
        // 修改: 启动新的轮询循环
        mainPollingLoop();
    }
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log(`手柄 ${e.gamepad.index} 断开：${e.gamepad.id}`);
    if (e.gamepad.index === currentGamepadIndex) {
        const availableGamepads = navigator.getGamepads().filter(g => !!g);
        if (availableGamepads.length > 0) {
            // 修复：尝试切换到上一个活跃的手柄，如果上一个不存在，则切换到第一个
            let newIndex = -1;
            for (let i = availableGamepads.length - 1; i >= 0; i--) {
                if (availableGamepads[i].index === lastActiveGamepadIndex) {
                    newIndex = availableGamepads[i].index;
                    break;
                }
            }
            if (newIndex === -1) {
                newIndex = availableGamepads[0].index;
            }
            currentGamepadIndex = newIndex;
            
            // 断开后，切换到新的手柄时再次检测协议
            currentProtocol = detectGamepadProtocol(navigator.getGamepads()[currentGamepadIndex]);
            toggleUI();
            
        } else {
            currentGamepadIndex = null;
            // 所有手柄断开，隐藏UI
            if(xinputUI) xinputUI.style.display = 'none';
            if(dinputUI) dinputUI.style.display = 'none';
        }
    }
    updateDeviceTabs(); // 更新选项卡
    if (navigator.getGamepads().every(g => !g)) {
        // 修改: 停止新的轮询循环
        cancelAnimationFrame(pollingInterval);
        pollingInterval = null;
    }
});

// 新增：震动测试功能
// 左震动
if (vibrateButtonL) {
    vibrateButtonL.addEventListener('click', () => {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[currentGamepadIndex];
        if (gamepad && gamepad.vibrationActuator) {
            // 修复BUG: 确保滑块值精确到一位小数，避免浮点数精度问题
            const rumble = Math.round(parseFloat(rumbleInputL.value) * 10) / 10;
            const duration = parseInt(durationInputL.value, 10);
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: 0, // 左边为强震动，弱震动设为0
                strongMagnitude: rumble, // 强震动由滑块控制
            });
        } else {
            alert('当前手柄不支持震动功能或未连接。');
        }
    });
}
// 右震动
if (vibrateButtonR) {
    vibrateButtonR.addEventListener('click', () => {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[currentGamepadIndex];
        if (gamepad && gamepad.vibrationActuator) {
            // 修复BUG: 确保滑块值精确到一位小数，避免浮点数精度问题
            const rumble = Math.round(parseFloat(rumbleInputR.value) * 10) / 10;
            const duration = parseInt(durationInputR.value, 10);
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: rumble, // 右边为弱震动，弱震动由滑块控制
                strongMagnitude: 0, // 强震动设为0
            });
        } else {
            alert('当前手柄不支持震动功能或未连接。');
        }
    }
);
}


// 新增：实时更新震动滑块值
// 修复BUG: 确保显示值精确到一位小数，避免浮点数精度问题
if (rumbleInputL) {
    rumbleInputL.addEventListener('input', () => {
        const value = Math.round(parseFloat(rumbleInputL.value) * 10) / 10;
        if (rumbleValueElL) rumbleValueElL.textContent = value.toFixed(1);
    });
}
if (rumbleInputR) {
    rumbleInputR.addEventListener('input', () => {
        const value = Math.round(parseFloat(rumbleInputR.value) * 10) / 10;
        if (rumbleValueElR) rumbleValueElR.textContent = value.toFixed(1);
    });
}

// 修复BUG: 移动DOM元素获取到函数内部
// 修改：显示轮询率测试弹窗并启动倒计时
function showPollingRateModal() {
    const pollingRateModal = document.getElementById('polling-rate-modal');
    const modalCountdownEl = document.getElementById('modal-countdown');
    const pollingRecordsList = document.getElementById('polling-records-list');
    const minRateEl = document.getElementById('min-rate');
    const maxRateEl = document.getElementById('max-rate');
    const avgRateEl = document.getElementById('avg-rate');
    const sampleCountEl = document.getElementById('sample-count');
    const totalTimeEl = document.getElementById('total-time');
    const avgRateHzEl = document.getElementById('avg-rate-hz');
    
    // BUG修复：获取输入框元素
    const sampleCountInput = document.getElementById('sample-count-input');
    // 设置默认采样数
    const targetSamples = sampleCountInput ? parseInt(sampleCountInput.value, 10) : 1000;


    if (currentGamepadIndex === null) {
        alert('请先连接一个手柄！');
        return;
    }

    // 清理之前的计时器
    clearInterval(countdownInterval);
    cancelAnimationFrame(pollingRateTestInterval);

    // 重置UI
    if (pollingRateModal) pollingRateModal.style.display = 'flex';
    if (modalCountdownEl) modalCountdownEl.textContent = '测试将在 5s 后开始...';
    if (pollingRecordsList) pollingRecordsList.innerHTML = '';
    // 修改：重置新指标的UI
    if (minRateEl) minRateEl.textContent = '--';
    if (maxRateEl) maxRateEl.textContent = '--';
    if (avgRateEl) avgRateEl.textContent = '--';
    if (sampleCountEl) sampleCountEl.textContent = '--';
    if (totalTimeEl) totalTimeEl.textContent = '--';
    if (avgRateHzEl) avgRateHzEl.textContent = '--'; // 新增重置平均回报率
    pollingRateRecords = [];
    testRecordCount = 0;
    
    // 修复BUG: 重置时间戳
    lastGamepadTimestamp = 0;

    let countdown = 5;
    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            if (modalCountdownEl) modalCountdownEl.textContent = `测试将在 ${countdown}s 后开始...`;
        } else {
            clearInterval(countdownInterval);
            // 修复：更新倒计时文本，去除对不存在元素的引用
            if (modalCountdownEl) modalCountdownEl.textContent = `测试开始！正在记录 ${targetSamples} 个样本...`;
            startPollingRateTest();
        }
    }, 1000);
}

// 新增：显示串键测试弹窗
function showCrosstalkModal() {
    const modal = document.getElementById('crosstalk-modal');
    if (modal) {
        modal.style.display = 'flex';
        resetCrosstalkTest();
    }
}

// 新增：开始串键测试
function startCrosstalkTest() {
    const startButton = document.getElementById('start-crosstalk-button');
    const closeButton = document.getElementById('close-crosstalk-button');
    const countInput = document.getElementById('crosstalk-count-input');
    const directionRadios = document.getElementsByName('crosstalk-direction');
    const resultText = document.getElementById('crosstalk-result-text');
    
    // 禁用开始按钮，启用关闭按钮
    startButton.disabled = true;
    closeButton.disabled = false;
    
    // 获取设置
    crosstalkTargetCount = parseInt(countInput.value, 10);
    directionRadios.forEach(radio => {
        if (radio.checked) {
            crosstalkTargetDirection = radio.value;
        }
    });

    // 重置状态
    resetCrosstalkTest();
    crosstalkTestState = true;
    resultText.textContent = '测试进行中...';
}

// 新增：更新串键测试UI
function updateCrosstalkUI() {
    const recordsList = document.getElementById('crosstalk-records-list');
    const currentCountEl = document.getElementById('crosstalk-current-count');

    // 清空列表，重新渲染
    recordsList.innerHTML = '';
    const arrowMap = {
        'up': '↑',
        'down': '↓',
        'left': '←',
        'right': '→'
    };

    crosstalkTestRecords.forEach(record => {
        const li = document.createElement('li');
        
        const mainArrow = arrowMap[record.type];
        let displayString = `按键: ${mainArrow}`;
        
        // 检查是否有串键并更新显示字符串
        if (record.crosstalkedWith && record.crosstalkedWith.length > 0) {
            const crosstalkArrows = record.crosstalkedWith.map(btn => arrowMap[btn]).join(', ');
            displayString += ` 出现串键: ${crosstalkArrows}`;
            li.classList.add('crosstalk-record-red'); // 为有串键的列表项添加红色警示类
        }

        li.textContent = displayString;
        recordsList.appendChild(li);
    });
    
    currentCountEl.textContent = crosstalkCurrentCount;

    // 自动滚动到最新记录
    recordsList.scrollTop = recordsList.scrollHeight;
}
// 新增：分析串键测试结果
function analyzeCrosstalkResults() {
    let crosstalkCount = 0;
    crosstalkTestRecords.forEach(record => {
        // 检查 record.crosstalkedWith 数组是否有内容
        if (record.crosstalkedWith && record.crosstalkedWith.length > 0) {
            crosstalkCount++;
        }
    });

    const resultText = document.getElementById('crosstalk-result-text');
    let message = `共检测到 ${crosstalkCurrentCount} 次有效按键。其中串键次数：${crosstalkCount} 次。评价结果：`;
    const crosstalkPercentage = crosstalkCurrentCount > 0 ? (crosstalkCount / crosstalkCurrentCount) * 100 : 0;
    
    // 移除之前的颜色类
    resultText.classList.remove('crosstalk-result-green', 'crosstalk-result-orange', 'crosstalk-result-blue', 'crosstalk-result-red');

    // 根据串键百分比添加新的颜色类
    if (crosstalkCount === 0) {
        message += '无串键';
        resultText.classList.add('crosstalk-result-green');
    } else if (crosstalkPercentage <= 10) {
        message += '轻微串键';
        resultText.classList.add('crosstalk-result-orange');
    } else if (crosstalkPercentage <= 30) {
        message += '中度串键';
        resultText.classList.add('crosstalk-result-blue');
    } else {
        message += '严重串键';
        resultText.classList.add('crosstalk-result-red');
    }

    resultText.textContent = message;
}

// 新增：停止串键测试
function stopCrosstalkTest() {
    crosstalkTestState = false;
    const startButton = document.getElementById('start-crosstalk-button');
    const closeButton = document.getElementById('close-crosstalk-button');
    startButton.disabled = false;
    closeButton.disabled = false;
    analyzeCrosstalkResults();
}

// 新增：重置串键测试状态
function resetCrosstalkTest() {
    crosstalkTestState = false;
    crosstalkTestRecords = [];
    crosstalkCurrentCount = 0;
    lastDpadButton = null;

    const recordsList = document.getElementById('crosstalk-records-list');
    const resultText = document.getElementById('crosstalk-result-text');
    const currentCountEl = document.getElementById('crosstalk-current-count');
    const startButton = document.getElementById('start-crosstalk-button');

    if (recordsList) recordsList.innerHTML = '';
    if (resultText) resultText.textContent = '等待测试...';
    if (currentCountEl) currentCountEl.textContent = '0';
    if (startButton) startButton.disabled = false;
}

// 修改：开始轮询率测试
function startPollingRateTest() {
    const pollingRecordsList = document.getElementById('polling-records-list');
    
    // BUG修复：获取输入框元素并设置目标采样数
    const sampleCountInput = document.getElementById('sample-count-input');
    const targetSamples = sampleCountInput ? parseInt(sampleCountInput.value, 10) : 1000;

    let lastTimestamp = performance.now();
    let lastGamepadTestTimestamp = 0;
    testStartTime = performance.now();

    function pollingLoop(timestamp) {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[currentGamepadIndex];

        if (gamepad) {
            // 核心：只有当手柄的timestamp变化时才记录数据。
            // 这是一个比简单地轮询 requestAnimationFrame 更可靠的测量方法，
            // 因为它直接反映了手柄硬件数据更新的频率。
            if (gamepad.timestamp !== lastGamepadTestTimestamp) {
                const delta = timestamp - lastTimestamp;
                if (delta > 0) {
                    pollingRateRecords.push(delta); // 存储时间间隔
                    testRecordCount++;
                    if (pollingRecordsList) updatePollingRecordsList(testRecordCount, delta);
                }
                lastTimestamp = timestamp;
                lastGamepadTestTimestamp = gamepad.timestamp;
            }
        }

        if (testRecordCount >= targetSamples) {
            stopPollingRateTest();
        } else {
            pollingRateTestInterval = requestAnimationFrame(pollingLoop);
        }
    }
    
    // 启动测试
    pollingRateTestInterval = requestAnimationFrame(pollingLoop);
}

// 修改：停止轮询率测试并显示结果
function stopPollingRateTest() {
    const minRateEl = document.getElementById('min-rate');
    const maxRateEl = document.getElementById('max-rate');
    const avgRateEl = document.getElementById('avg-rate');
    const sampleCountEl = document.getElementById('sample-count');
    const totalTimeEl = document.getElementById('total-time');
    const avgRateHzEl = document.getElementById('avg-rate-hz');
    const modalCountdownEl = document.getElementById('modal-countdown');
    
    cancelAnimationFrame(pollingRateTestInterval);
    const totalTime = performance.now() - testStartTime;
    
    let minDelay = Infinity;
    let maxDelay = 0;

    if (pollingRateRecords.length > 0) {
        minDelay = Math.min(...pollingRateRecords);
        maxDelay = Math.max(...pollingRateRecords);
    }
    
    const avgDelay = pollingRateRecords.length > 0 ? pollingRateRecords.reduce((a, b) => a + b, 0) / pollingRateRecords.length : 0;
    
    // ** 修改：直接显示毫秒值，而不是计算Hz **
    if (minRateEl) minRateEl.textContent = minDelay.toFixed(2);
    if (maxRateEl) maxRateEl.textContent = maxDelay.toFixed(2);
    if (avgRateEl) avgRateEl.textContent = avgDelay.toFixed(2);
    
    // 新增：计算并显示平均回报率（Hz）
    const avgRateHz = avgDelay > 0 ? (1000 / avgDelay).toFixed(2) : '0';
    if (avgRateHzEl) avgRateHzEl.textContent = avgRateHz;
    
    if (sampleCountEl) sampleCountEl.textContent = testRecordCount;
    if (totalTimeEl) totalTimeEl.textContent = totalTime.toFixed(2);

    if (modalCountdownEl) modalCountdownEl.textContent = '测试已完成。请查看结果。';
}


// 新增：更新测试记录列表，只显示次序和时间间隔
function updatePollingRecordsList(recordNumber, interval) {
    const pollingRecordsList = document.getElementById('polling-records-list');
    const li = document.createElement('li');
    li.textContent = `第 ${recordNumber} 次记录: ${interval.toFixed(2)} ms`;
    if (pollingRecordsList) {
        pollingRecordsList.prepend(li); // 新记录在最上面
        // 保持列表不超过一定数量，避免性能问题
        if (pollingRecordsList.childElementCount > 30) {
            pollingRecordsList.removeChild(pollingRecordsList.lastChild);
        }
    }
}


// 首次加载时更新一次选项卡
window.onload = () => {
    updateDeviceTabs();
    const gamepads = navigator.getGamepads();
    if (gamepads.some(g => !!g)) {
        lastPollTime = performance.now();
        // 修改: 启动新的轮询循环
        mainPollingLoop();
        
        // 首次加载时检测协议并切换UI
        currentGamepadIndex = gamepads.findIndex(g => !!g);
        currentProtocol = detectGamepadProtocol(gamepads[currentGamepadIndex]);
        toggleUI();
    } else {
        // 如果没有手柄连接，创建Dinput UI但隐藏它
        createDinputUI();
        if(xinputUI) xinputUI.style.display = 'none';
        if(dinputUI) dinputUI.style.display = 'none';
    }

    // 修复BUG: 将事件监听器移至此函数内，确保元素在被访问时已加载
    // 修改：打开诊断页面按钮的事件监听器
    const openDiagnosticsButton = document.getElementById('open-diagnostics-button');
    if (openDiagnosticsButton) {
        openDiagnosticsButton.addEventListener('click', () => {
            showPollingRateModal();
        });
    }

    // 新增：关闭弹窗按钮的事件监听器
    const closeModalButton = document.getElementById('close-modal-button');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            const pollingRateModal = document.getElementById('polling-rate-modal');
            if (pollingRateModal) pollingRateModal.style.display = 'none';
            // BUG 修复: 在关闭弹窗时清除定时器，避免后台持续运行
            clearInterval(countdownInterval);
            cancelAnimationFrame(pollingRateTestInterval);
        });
    }

    // 新增：重新测试按钮的事件监听器
    const restartTestButton = document.getElementById('restart-test-button');
    if (restartTestButton) {
        restartTestButton.addEventListener('click', () => {
            showPollingRateModal();
        });
    }
    

    
    // 新增：打开串键测试弹窗按钮的事件监听器
    const openCrosstalkButton = document.getElementById('open-crosstalk-button');
    if (openCrosstalkButton) {
        openCrosstalkButton.addEventListener('click', () => {
            showCrosstalkModal();
        });
    }

    // 新增：串键测试弹窗内部按钮的事件监听器
    const startCrosstalkButton = document.getElementById('start-crosstalk-button');
    if (startCrosstalkButton) {
        startCrosstalkButton.addEventListener('click', () => {
            startCrosstalkTest();
        });
    }

    const closeCrosstalkButton = document.getElementById('close-crosstalk-button');
    if (closeCrosstalkButton) {
        closeCrosstalkButton.addEventListener('click', () => {
            const crosstalkModal = document.getElementById('crosstalk-modal');
            if (crosstalkModal) crosstalkModal.style.display = 'none';
            resetCrosstalkTest(); // 确保关闭时重置状态
        });
    }
    // 新增：串键测试说明展开/收起功能
    const instructionsToggle = document.getElementById('crosstalk-instructions-toggle');
    const instructionsContent = document.getElementById('crosstalk-instructions-content');
    const toggleArrow = document.getElementById('toggle-arrow');

    if (instructionsToggle && instructionsContent && toggleArrow) {
        instructionsToggle.addEventListener('click', () => {
            // 切换内容的显示/隐藏状态
            instructionsContent.classList.toggle('instructions-content-hidden');
            // 切换箭头方向
            toggleArrow.classList.toggle('rotate');
        });
    }
};