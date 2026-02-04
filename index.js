const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const configPath = __dirname + '/config.json';
let config = {
  webhooks: {
    default: {
      name: '默认群',
      url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3dfeaca5-345e-474e-b619-ea5b10f877a8'
    }
  },
  default: 'default',
  rateLimit: {
    windowMs: 60000,
    max: 50
  }
};

try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = { ...config, ...JSON.parse(configFile) };
  console.log('配置文件加载成功');
} catch (e) {
  console.log('使用默认配置');
}

const rateLimit = {
  windowMs: config.rateLimit?.windowMs || 60000,
  max: config.rateLimit?.max || 50,
  calls: {}
};

function checkRateLimit(webhookName) {
  const now = Date.now();
  if (!rateLimit.calls[webhookName]) rateLimit.calls[webhookName] = [];
  rateLimit.calls[webhookName] = rateLimit.calls[webhookName].filter(t => now - t < rateLimit.windowMs);
  if (rateLimit.calls[webhookName].length >= rateLimit.max) return false;
  rateLimit.calls[webhookName].push(now);
  return true;
}

function sendToWechat(webhookUrl, message) {
  return new Promise((resolve, reject) => {
    try {
      const postData = JSON.stringify(message);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(webhookUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`企业微信响应解析失败: ${data}`));
          }
        });
      });

      req.on('error', e => reject(e));
      req.write(postData);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

app.post('/', async (req, res) => {
  try {
    const webhookName = req.body.webhook || config.default || 'default';
    const webhook = config.webhooks[webhookName];

    if (!webhook) {
      console.error(`Webhook ${webhookName} 不存在`);
      return res.status(200).json({ 
        status: "error", 
        message: `Webhook ${webhookName} 不存在` 
      });
    }

    if (!checkRateLimit(webhookName)) {
      return res.status(200).json({ 
        status: "ok", 
        message: "频率限制，稍后重试" 
      });
    }

    let tmData = {};
    try {
      tmData = typeof req.body.tm_data === 'string' 
        ? JSON.parse(req.body.tm_data) 
        : req.body.tm_data;
    } catch (e) {
      tmData = req.body.tm_data || {};
    }

    const {
      monitorId, resultEnd, resultId, resultScore, resultStart,
      resultUrl, searchCreator, searchDescription, searchId,
      searchName, searchType, webhookCallEventName, webhookCallTime
    } = tmData;

    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Shanghai'
    });

    const content = `TrendMiner 监控告警
监控ID: ${monitorId || '未知'}
搜索ID: ${searchId || '未知'}
结果ID: ${resultId || '未知'}
结果分数: ${resultScore || '未知'}
搜索名称: ${searchName || '未知'}
搜索类型: ${searchType || '未知'}
创建人: ${searchCreator || '未知'}
搜索描述: ${searchDescription || '未知'}
事件类型: ${webhookCallEventName || '未知'}
结果开始时间: ${resultStart || '未知'}
结果结束时间: ${resultEnd || '未知'}
触发时间: ${webhookCallTime || '未知'}
查看详情: ${resultUrl || '无链接'}
本地接收时间：${timestamp}`;

    const wechatResult = await sendToWechat(webhook.url, {
      msgtype: 'text',
      text: { content: `请注意有问题\n${content}` }
    });

    console.log(`消息已发送到 ${webhook.name} (${webhookName})`);
    res.status(200).json({
      status: "ok",
      message: `消息已发送到 ${webhook.name}`,
      webhook: webhookName,
      wechatResult
    });
  } catch (error) {
    console.error('服务错误:', error);
    res.status(200).json({
      status: "processed",
      message: "处理中，已记录错误",
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    errcode: 0, 
    errmsg: "ok",
    webhooks: Object.keys(config.webhooks)
  });
});

app.get('/webhooks', (req, res) => {
  const webhookList = Object.entries(config.webhooks).map(([key, value]) => ({
    key,
    name: value.name,
    url: value.url.replace(/key=.+$/, 'key=***')
  }));
  res.json(webhookList);
});

app.listen(PORT, () => {
  console.log(`服务启动在 ${PORT} 端口`);
  console.log(`已配置的webhooks: ${Object.keys(config.webhooks).join(', ')}`);
});

module.exports = app;
