const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

/** 豆包方舟密钥：优先 DOUBAO_API_KEY，兼容仅配置了 OPENAI_API_KEY 的旧 .env */
function resolveDoubaoApiKey() {
  const k = process.env.DOUBAO_API_KEY || process.env.OPENAI_API_KEY;
  return k && String(k).trim() ? String(k).trim() : '';
}

app.use(express.static('.'));
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  try {
    const apiKey = resolveDoubaoApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error:
          '出错：未配置 API 密钥。请在 .env 中设置 DOUBAO_API_KEY 或 OPENAI_API_KEY 后重启服务。'
      });
    }

    // 方舟 API 的 model 字段应填「推理接入点」的 Endpoint ID（通常以 ep- 开头），不是控制台里的模型展示名
    const modelId = (process.env.DOUBAO_MODEL || '').trim();
    if (!modelId) {
      return res.status(500).json({
        error:
          '出错：未配置 DOUBAO_MODEL。请打开火山方舟控制台 → 推理接入点 → 复制 Endpoint ID，在 .env 中写入：DOUBAO_MODEL=ep-xxxx，保存后重启 node server.js。'
      });
    }

    const { jobTitle, experience } = req.body;
    const prompt = `请把以下工作经验，优化成专业英文简历要点，岗位：${jobTitle}。内容：${experience}`;

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(
        typeof data.error === 'object' && data.error.message
          ? data.error.message
          : String(data.error || 'API调用失败')
      );
    }
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('模型未返回有效内容，请检查 DOUBAO_MODEL 与密钥是否匹配该接入点。');
    }
    res.json({ result: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '出错：' + err.message });
  }
});

app.listen(port, () => {
  console.log('✅ 服务启动成功：http://localhost:' + port);
  if (!resolveDoubaoApiKey()) {
    console.warn('⚠️  未检测到 DOUBAO_API_KEY / OPENAI_API_KEY：/api/generate 将无法鉴权，请在 .env 中配置其一后重启。');
  }
  if (!(process.env.DOUBAO_MODEL || '').trim()) {
    console.warn('⚠️  未检测到 DOUBAO_MODEL：请在 .env 中填写方舟推理接入点 Endpoint ID（ep-xxxx）。');
  }
});
