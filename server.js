const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 添加 fetch 支持
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DeepSeek汽车诊断后端服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路径路由，用于基础检查
app.get('/', (req, res) => {
  res.json({
    service: 'DeepSeek汽车诊断API',
    version: '1.0.0',
    status: '运行中',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      status: '/api/status',
      chat: '/api/chat'
    }
  });
});

// DeepSeek汽车诊断端点
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], carInfo = '', problem = '' } = req.body;

    console.log('收到诊断请求:', {
      message: message.substring(0, 100) + '...',
      historyLength: history.length,
      carInfo,
      problem
    });

    // 验证API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    // 如果API密钥未配置，使用智能模拟数据
    if (!apiKey || apiKey === '你的DeepSeek_API密钥') {
      console.log('⚠️ 使用智能模拟数据（API密钥未配置）');
      
      // 智能模拟响应
      const mockResponses = {
        '无法启动': `🚗 **车辆无法启动诊断方案**

**🔧 初步检查：**
1. **检查电池** - 测量电压（正常值：12.6V以上）
2. **听启动声音** - 是否有"咔嗒"声或完全无声
3. **检查仪表盘** - 是否有警告灯亮起

**🔍 详细诊断：**
- 如果完全无声：检查主继电器、启动机电路
- 如果有"咔嗒"声但无法启动：检查电池电量和连接
- 如果启动机转动但发动机不工作：检查燃油系统和点火系统

**📍 下一步建议：**
请告诉我具体的症状，我会提供更精确的诊断方案。`,

        '异响': `🔊 **发动机异响诊断方案**

**🎵 异响类型识别：**
1. **敲击声**（类似金属敲击）→ 可能：爆震、活塞问题
2. **啸叫声**（高频尖锐）→ 可能：皮带、轴承问题  
3. **嘎吱声**（低频沉闷）→ 可能：悬挂、底盘问题
4. **嗡嗡声**（持续稳定）→ 可能：水泵、发电机轴承

**🔧 检查步骤：**
- 确定异响出现的时机（冷车/热车、加速/减速）
- 尝试定位异响大致来源（发动机前部/后部/底部）
- 检查相关部件的磨损情况`,

        '充电': `⚡ **充电系统诊断方案**

**新能源车辆充电问题排查：**

**🔌 基础检查：**
1. **充电设备** - 检查充电枪、电缆是否完好
2. **电源供应** - 测试电源插座电压（正常：220V±10%）
3. **车辆接口** - 检查充电口是否有异物或损坏

**📱 车辆状态检查：**
- 仪表盘充电指示灯状态
- 电池SOC（电量）显示
- 充电预约设置是否正确`,

        '刹车': `🛑 **刹车系统诊断方案**

**⚠️ 安全提示：刹车系统涉及安全，建议立即检查**

**🔧 常见问题排查：**
1. **刹车软/行程长** - 检查刹车油、刹车片磨损
2. **刹车异响** - 检查刹车片材质、盘片配合
3. **刹车抖动** - 检查刹车盘平整度
4. **刹车跑偏** - 检查分泵、刹车管路`,

        '空调': `❄️ **空调系统诊断方案**

**🌡️ 空调不制冷排查：**

**🔧 基础检查：**
1. **空调压缩机** - 听是否有吸合声音
2. **冷凝器风扇** - 检查是否正常工作
3. **制冷剂压力** - 检查高低压管路压力
4. **空调滤芯** - 检查是否堵塞`

      };

      let response = mockResponses['无法启动']; // 默认响应
      
      // 根据问题关键词选择响应
      for (const [key, value] of Object.entries(mockResponses)) {
        if (message.includes(key)) {
          response = value;
          break;
        }
      }

      // 如果没有匹配的关键词，使用默认响应
      if (response === mockResponses['无法启动'] && !message.includes('无法启动')) {
        response = `👨‍🔧 **专业汽车诊断助手**

我已收到您的车辆问题："${message.substring(0, 50)}..."

**🚗 您的车辆信息：** ${carInfo || '未提供'}
**🔧 问题类型：** ${problem || '用户描述的问题'}

请详细描述以下信息，我会为您提供精准诊断：
1. 问题出现的具体现象
2. 发生时的车辆状态
3. 已尝试的解决方法

💡 **提示：** 配置DeepSeek API密钥可获得AI智能诊断`;
      }

      const fullResponse = `${response}\n\n---\n*🔧 当前使用本地诊断引擎 | 配置API密钥启用AI智能诊断*`;

      return res.json({ 
        reply: fullResponse,
        mock: true,
        timestamp: new Date().toISOString()
      });
    }

    // 真实API调用代码
    console.log('调用DeepSeek API，消息数量:', history.length + 2);

    // 构建系统提示词
    const systemPrompt = `你是一名专业的汽车维修诊断专家，具有20年汽车维修经验。

用户角色：普通车主，可能缺乏专业汽车知识
你的任务：诊断汽车问题并提供解决方案

诊断原则：
1. 仔细分析用户描述的汽车问题
2. 提供专业、准确的诊断建议
3. 按照标准的汽车诊断流程进行指导
4. 用通俗易懂的语言解释技术问题
5. 提供具体的维修建议和注意事项
6. 对于安全问题要特别强调
7. 分步骤指导用户进行检查

沟通风格：
- 专业但友好
- 使用通俗易懂的语言
- 分步骤说明
- 强调安全注意事项
- 提供实用的建议

车辆信息：${carInfo || '未提供具体车辆信息'}
主要问题：${problem || '用户描述的问题'}

请用中文回答，保持专业且友好的态度。`;

    // 构建对话消息
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...history,
      { 
        role: 'user', 
        content: message.trim() 
      }
    ];

    // 调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API错误:', response.status, errorText);
      
      // 优雅降级到模拟数据
      const fallbackResponse = `抱歉，AI服务暂时不可用。\n\n基于您的问题，建议：\n1. 检查车辆基础状态\n2. 联系专业维修店\n3. 使用车辆诊断仪读取故障码\n\n车辆: ${carInfo || '未指定'}\n问题: ${problem || '用户描述的问题'}`;
      
      return res.json({ 
        reply: fallbackResponse,
        error: true,
        fallback: true
      });
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content;

    if (!reply) {
      console.error('DeepSeek API返回空回复:', data);
      throw new Error('AI返回空响应');
    }

    console.log('DeepSeek API调用成功，回复长度:', reply.length);
    
    // 返回成功响应
    res.json({ 
      reply,
      usage: data.usage,
      model: data.model,
      ai: true
    });
    
  } catch (error) {
    console.error('API处理错误:', error);
    
    // 最终降级方案
    const finalFallback = `🚗 **汽车诊断建议**

由于服务暂时不可用，建议您：

**🔧 立即检查：**
1. 车辆基础状态（机油、水温、电池）
2. 仪表盘警告灯状态
3. 异响、异味等异常现象

**📞 紧急处理：**
- 如涉及安全问题，请立即停车检查
- 联系专业维修人员
- 使用车辆自检功能

车辆信息：${req.body.carInfo || '未提供'}
问题描述：${req.body.problem || '用户描述的问题'}

*💡 提示：服务恢复后将提供AI智能诊断*`;
    
    res.json({ 
      reply: finalFallback,
      error: true,
      finalFallback: true
    });
  }
});

// 获取服务状态
app.get('/api/status', (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const hasValidApiKey = apiKey && apiKey !== '你的DeepSeek_API密钥';
  
  res.json({
    status: 'running',
    service: 'DeepSeek汽车诊断API',
    version: '1.0.0',
    ai_enabled: hasValidApiKey,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    code: 'NOT_FOUND'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR'
  });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`🚗 汽车诊断后端服务运行在端口: ${port}`);
  console.log(`🔧 健康检查: http://localhost:${port}/health`);
  console.log(`📊 服务状态: http://localhost:${port}/api/status`);
  console.log(`💬 诊断接口: http://localhost:${port}/api/chat`);
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const hasValidApiKey = apiKey && apiKey !== '你的DeepSeek_API密钥';
  console.log(`🤖 AI状态: ${hasValidApiKey ? '✅ 已配置' : '⚠️ 未配置（使用模拟数据）'}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('收到终止信号，正在关闭服务器...');
  process.exit(0);
});