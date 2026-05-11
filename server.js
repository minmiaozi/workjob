const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- 关键修改1：静态文件路径改为绝对路径 ---
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// --- 关键修改2：API Key 校验增强，提前拦截错误 ---
function resolveDoubaoApiKey() {
  const k = process.env.DOUBAO_API_KEY || process.env.OPENAI_API_KEY;
  return k && String(k).trim() ? String(k).trim() : '';
}

// --- 关键修改3：API 路由增加详细错误日志 ---
app.post('/api/generate', async (req, res) => {
  try {
    const apiKey = resolveDoubaoApiKey();
    const modelId = (process.env.DOUBAO_MODEL || '').trim();

    // 提前校验关键配置
    if (!apiKey) {
      console.error('❌ 错误：DOUBAO_API_KEY 未配置');
      return res.status(500).json({ error: '未配置 API 密钥。请在 Vercel 环境变量中设置 DOUBAO_API_KEY 后重新部署。' });
    }
    if (!modelId) {
      console.error('❌ 错误：DOUBAO_MODEL 未配置');
      return res.status(500).json({ error: '未配置 DOUBAO_MODEL。请在 Vercel 环境变量中设置后重新部署。' });
    }

    // --- 你的原有 API 调用逻辑 ---
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
      throw new Error(`API 请求失败，状态码：${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ /api/generate 错误:', error);
    res.status(500).json({ error: '服务器内部错误，请查看部署日志排查问题。' });
  }
});

// --- 关键修改4：根路由兜底，确保能返回 index.html ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 关键修改5：导出 app，适配 Vercel 无服务器函数 ---
module.exports = app;