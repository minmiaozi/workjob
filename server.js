const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// 根路由，返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API 路由
app.post('/api/generate', async (req, res) => {
  try {
    const apiKey = process.env.DOUBAO_API_KEY;
    const modelId = process.env.DOUBAO_MODEL;

    if (!apiKey || !modelId) {
      return res.status(500).json({ error: '服务器配置错误，请检查环境变量' });
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: req.body.messages,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('API Error:', errData);
      return res.status(500).json({ error: `API 请求失败: ${errData.error?.message || '未知错误'}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// 导出 app，适配 Vercel 无服务器函数
module.exports = app;