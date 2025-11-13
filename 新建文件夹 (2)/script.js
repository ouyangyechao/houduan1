// 品牌数据（部分省略），使用 categories 数组分类
const brands = [
    { name: "比亚迪", logo: "logo_url_1", categories: ["国产", "新能源"] },
    { name: "奥迪", logo: "logo_url_2", categories: ["德系"] },
    // ... 其他品牌数据 ...
    { name: "理想", logo: "logo_url_n", categories: ["新能源"] }
];

// 语音识别初始化
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

// 当前诊断流程（针对“交流无法充电”预设的问答）
const diagnosisFlow = [
    { question: "根据您的描述，车辆是否能上高压电？", options: ["是", "否"] },
    { question: "动力电池SOC值是否满足充电条件？", options: ["是", "否"] },
    { question: "组合仪表充电连接信号是否点亮？", options: ["是", "否"] },
    { question: "仪表是否显示充电连接中界面？", options: ["是", "否"] },
    { question: "测量CP信号波形是否为6-负12V方波信号？", options: ["是", "否"] },
    { question: "组合仪表是否跳转至交流成功充电中界面？", options: ["是", "否"] },
    { question: "观察数据流S2开关状态是否闭合？", options: ["是", "否"] },
    { question: "观察数据流充电功率是否正常？", options: ["是", "否"] },
    { question: "故障点为高压多合一模块内部S2开关的控制线路及元件", options: ["返回首页", "重新诊断"] }
];

let currentStep = 0;
let selectedBrand = null;
let currentProblem = "";
let currentCarInfo = "";
let conversationHistory = [];
let isAIConnected = false;
let isChargingProblem = false;
let chatHistoryData = [];
let currentChatId = null;

// DOM 元素获取
const introScreen = document.getElementById('intro-screen');
const apiStatus = document.getElementById('api-status');
const pageAuth = document.getElementById('page-auth');
const navbar = document.getElementById('navbar');
const pageBrand = document.getElementById('page-brand');
const pageVehicle = document.getElementById('page-vehicle');
const pageProblem = document.getElementById('page-problem');
const pageChat = document.getElementById('page-chat');
const pageProfile = document.getElementById('page-profile');
const brandsGrid = document.getElementById('brands-grid');
const selectedBrandDisplay = document.getElementById('selected-brand-display');
const vinInput = document.getElementById('vin-input');
const voiceInputBtn = document.getElementById('voice-input-btn');
const modelSelect = document.getElementById('model-select');
const yearSelect = document.getElementById('year-select');
const startDiagnosisBtn = document.getElementById('start-diagnosis-btn');
const backToBrandsBtn = document.getElementById('back-to-brands');
const backToVehicleBtn = document.getElementById('back-to-vehicle');
const backToProblemBtn = document.getElementById('back-to-problem');
const backToHomeBtn = document.getElementById('back-to-home');
const problemInput = document.getElementById('problem-input');
const submitProblemBtn = document.getElementById('submit-problem-btn');
const suggestedProblems = document.querySelectorAll('.suggested-problem');
const chatMessages = document.getElementById('chat-messages');
const chatHistory = document.getElementById('chat-history');
const chatSubtitle = document.getElementById('chat-subtitle');
const restartDiagnosisBtn = document.getElementById('restart-diagnosis-btn');
const chatSidebar = document.querySelector('.chat-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const profileName = document.getElementById('profile-name');
const profilePhone = document.getElementById('profile-phone');
const profilePlate = document.getElementById('profile-plate');
const saveProfileBtn = document.getElementById('save-profile-btn');
const diagnosisCount = document.getElementById('diagnosis-count');
const solvedCount = document.getElementById('solved-count');
const savedCount = document.getElementById('saved-count');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const voiceChatBtn = document.getElementById('voice-chat-btn');
const categoryTabs = document.querySelectorAll('.category-tab');
const newChatBtn = document.getElementById('new-chat-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const profileNavBtns = document.querySelectorAll('.profile-nav-btn');
const profileContents = document.querySelectorAll('.profile-content');
const diagnosisHistoryList = document.getElementById('diagnosis-history-list');
const clearDataBtn = document.getElementById('clear-data-btn');
const quickActionBtn = document.getElementById('quick-action-btn');
const quickActionPanel = document.getElementById('quick-action-panel');
const quickProfile = document.getElementById('quick-profile');
const quickDiagnosis = document.getElementById('quick-diagnosis');
const quickHistory = document.getElementById('quick-history');
const quickSettings = document.getElementById('quick-settings');
const authError = document.getElementById('auth-error');
const quickActions = document.getElementById('quick-actions');
const logoutProfileBtn = document.getElementById('logout-profile-btn');
const brandSearchInput = document.getElementById('brand-search-input');

// 初始化函数
function init() {
    // 开场动画结束后显示登录页面
    setTimeout(() => {
        introScreen.style.display = 'none';
        showPage(pageAuth);
        renderBrands();
    }, 3000);
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    page.classList.add('active');
}

// 开始AI诊断（AI 接口调用，略）

// 保留的原始诊断流程（用于“交流无法充电”情形）
function startOriginalDiagnosis() {
    // 添加AI的初始消息
    addAIMessage(`您好，我是汽车诊断助手。根据您的描述，车辆出现"${currentProblem}"的问题，我将引导您完成诊断流程。`);
    // 添加第一个问题（延时一秒）
    setTimeout(() => {
        askQuestion(currentStep);
    }, 1000);
}

// 添加AI消息并输出
function addAIMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-ai';
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // 添加到对话历史
    conversationHistory.push({ role: 'assistant', content: text });
    // 使用语音合成朗读AI回复
    if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.1;
        utterance.rate = 0.95;
        // 选择中文女声（优先微软小晓）
        const availableVoices = window.speechSynthesis.getVoices();
        let selectedVoice = availableVoices.find(v => v.name.includes('Xiaoxiao'));
        if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => v.lang === 'zh-CN' && v.gender === 'female') || availableVoices.find(v => v.lang.startsWith('zh'));
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.onstart = () => {
            const avatar = document.getElementById('ai-avatar');
            if (avatar) avatar.classList.add('speaking');
        };
        utterance.onend = () => {
            const avatar = document.getElementById('ai-avatar');
            if (avatar) avatar.classList.remove('speaking');
        };
        window.speechSynthesis.speak(utterance);
    }
}

// 添加用户消息
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-user';
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // 添加到对话历史
    conversationHistory.push({ role: 'user', content: text });
}

// 添加选项按钮（用于原始诊断流程的问题选项）
function addOptions(options) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-ai';
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'message-options';
    options.forEach(option => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => {
            addUserMessage(option);
            handleAnswer(option);
        });
        optionsDiv.appendChild(optionBtn);
    });
    messageDiv.appendChild(optionsDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 提问下一个诊断问题
function askQuestion(step) {
    if (step >= diagnosisFlow.length) return;
    const question = diagnosisFlow[step].question;
    const options = diagnosisFlow[step].options;
    addAIMessage(question);
    addOptions(options);
}

// 处理用户答案
function handleAnswer(answer) {
    currentStep++;
    if (currentStep < diagnosisFlow.length) {
        setTimeout(() => {
            askQuestion(currentStep);
        }, 1000);
    } else {
        // 诊断完成
        addAIMessage("诊断已完成。如需进一步帮助，请点击重新诊断或联系专业技术人员。");
        updateSolvedCount();
    }
}

// 发送消息（集成 AI 功能）
async function sendMessage(msg) {
    const message = (typeof msg === 'string' ? msg : chatInput.value).trim();
    if (message === '') return;
    addUserMessage(message);
    if (typeof chatInput !== 'undefined' && chatInput) chatInput.value = '';
    if (isChargingProblem) {
        // “交流无法充电”问题，继续原有流程
        setTimeout(() => {
            addAIMessage('感谢您的反馈。请继续按照诊断流程进行操作。');
        }, 1000);
        return;
    }
    if (!isAIConnected) {
        // AI服务未连接，继续原有流程
        setTimeout(() => {
            addAIMessage('感谢您的反馈。请继续按照诊断流程进行操作。');
        }, 1000);
        return;
    }
    // 使用AI回复（假设有AI诊断接口）
    const thinkingMessage = addThinkingMessage();
    try {
        const carInfo = currentCarInfo || (selectedBrand ? `${selectedBrand.name} ${modelSelect.value} ${yearSelect.value}年款` : '未知车辆');
        const aiResponse = await callDeepSeekCarDiagnosis(message, conversationHistory, carInfo, currentProblem);
        // 移除“思考中”提示
        thinkingMessage.remove();
        // 添加AI回复
        addAIMessage(aiResponse);
    } catch (error) {
        thinkingMessage.remove();
        addAIMessage('抱歉，AI诊断服务暂时不可用。请稍后重试或联系专业技术人员。');
        console.error('发送消息失败:', error);
    }
}

// AI“思考中”消息
function addThinkingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-ai';
    messageDiv.innerHTML = `
        <div class="ai-typing">
            AI正在思考中<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// 声音识别：开始语音输入
function startVoiceInput(inputElement) {
    voiceIndicator.classList.add('active');
    if (!recognition) {
        alert('当前浏览器不支持语音识别');
        voiceIndicator.classList.remove('active');
        return;
    }
    // 配置识别事件
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceResult(transcript, inputElement);
    };
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        voiceIndicator.classList.remove('active');
    };
    recognition.onend = () => {
        voiceIndicator.classList.remove('active');
    };
    // 开始录音识别
    recognition.start();
}

// 处理语音识别结果
function handleVoiceResult(transcript, inputElement) {
    const text = transcript.trim();
    console.log('Voice input:', text);
    if (isChargingProblem) {
        // 当前处于诊断问答流程，期望回答是/否
        let answer = null;
        if (text.includes('不是') || text.includes('不') || text.includes('否')) {
            answer = '否';
        } else if (text.includes('是')) {
            answer = '是';
        }
        if (answer) {
            addUserMessage(answer);
            handleAnswer(answer);
        } else {
            addAIMessage('抱歉，我没有听清您的回答，请尝试回答是或否。');
        }
    } else {
        // 非预设流程，将识别文本作为普通提问发送
        sendMessage(text);
    }
    // （注：语音合成朗读AI回复在 addAIMessage 内已处理）
}

// 加载品牌列表，渲染品牌选项（略）
function renderBrands() { /* ... */ }

// 更新诊断次数统计
function updateDiagnosisCount() {
    // 递增诊断次数等（示意）
    diagnosisCount.textContent = parseInt(diagnosisCount.textContent) + 1;
}

// 更新已解决问题数
function updateSolvedCount() {
    solvedCount.textContent = parseInt(solvedCount.textContent) + 1;
}

// 事件绑定
submitProblemBtn.addEventListener('click', () => {
    if (problemInput.value.trim() === '') {
        alert('请输入问题描述');
        return;
    }
    currentProblem = problemInput.value.trim();
    chatSubtitle.textContent = `正在诊断：${currentProblem}`;
    showPage(pageChat);
    // 创建新聊天会话
    currentChatId = Date.now().toString();
    // 检查是否为“无法充电”相关问题
    isChargingProblem = currentProblem.includes('交流无法充电') || currentProblem.includes('无法充电');
    // 清空当前聊天记录
    chatMessages.innerHTML = '';
    conversationHistory = [];
    currentStep = 0;
    // 开始诊断
    if (isChargingProblem) {
        startOriginalDiagnosis();
    } else {
        startAIDiagnosis();
    }
    addToHistory();
    updateDiagnosisCount();
});

// 建议问题快捷填充
suggestedProblems.forEach(problem => {
    problem.addEventListener('click', () => {
        problemInput.value = problem.textContent;
    });
});

// 重新诊断按钮
restartDiagnosisBtn.addEventListener('click', () => {
    currentStep = 0;
    chatMessages.innerHTML = '';
    conversationHistory = [];
    if (isChargingProblem) {
        startOriginalDiagnosis();
    } else {
        startAIDiagnosis();
    }
});

// 新对话按钮
newChatBtn.addEventListener('click', () => {
    currentStep = 0;
    chatMessages.innerHTML = '';
    conversationHistory = [];
    currentChatId = Date.now().toString();
    if (isChargingProblem) {
        startOriginalDiagnosis();
    } else {
        startAIDiagnosis();
    }
    addToHistory();
});

// 侧边栏折叠（历史记录）
sidebarToggle.addEventListener('click', () => {
    chatSidebar.classList.toggle('active');
});

// 导航链接切换页面
navLinks.forEach(link => {
    if (link.id !== 'logout-btn') {
        link.addEventListener('click', () => {
            const pageId = link.getAttribute('data-page');
            showPage(document.getElementById(pageId));
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    }
});

// 保存个人资料
saveProfileBtn.addEventListener('click', saveProfileData);

// 清除数据
clearDataBtn.addEventListener('click', () => {
    if (confirm('确定要清除所有数据吗？此操作不可撤销。')) {
        localStorage.clear();
        alert('所有数据已清除');
        location.reload();
    }
});

// 点击上传图片/文件（隐藏输入域触发）已移除

// 点击语音输入按钮（聊天）
voiceChatBtn.addEventListener('click', () => {
    startVoiceInput();  // 调用语音识别，无需传入文本框
});

// 注：省略了登录、注册、个人中心等功能的实现细节
init();
