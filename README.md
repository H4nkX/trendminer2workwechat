# TrendMiner 到企业微信中转服务

基于 GitHub 的 TrendMiner 与企业微信之间的中转服务。

## 架构说明

```
TrendMiner → GitHub API (repository_dispatch) 
           → GitHub Actions (forward.yml)
           → Node.js 服务 (index.js)
           → 企业微信
```

## 配置步骤

### 1. 获取 GitHub Personal Access Token

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 创建新 Token，勾选 `repo` 权限
3. 复制生成的 Token

### 2. 配置 TrendMiner Webhook

**Webhook URL:**
```
https://api.github.com/repos/H4nkX/factorywebhooks/dispatches
```

**请求头:**
```
Authorization: Bearer YOUR_GITHUB_TOKEN
Content-Type: application/json
User-Agent: TrendMiner-Webhook
```

**请求体格式:**
```json
{
  "event_type": "tm_trigger",
  "client_payload": {
    "webhook": "default",
    "tm_data": {
      "monitorId": "监控ID",
      "resultId": "结果ID",
      "resultScore": "分数",
      "searchName": "搜索名称",
      "searchType": "类型",
      "searchCreator": "创建人",
      "searchDescription": "描述",
      "resultStart": "开始时间",
      "resultEnd": "结束时间",
      "webhookCallEventName": "事件",
      "webhookCallTime": "触发时间",
      "resultUrl": "详情链接"
    }
  }
}
```

## 多 Webhook 配置

编辑 `config.json` 文件添加多个企业微信群：

```json
{
  "webhooks": {
    "default": {
      "name": "默认群",
      "url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_1"
    },
    "production": {
      "name": "生产群",
      "url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_2"
    },
    "dev": {
      "name": "开发群",
      "url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_3"
    }
  },
  "default": "default",
  "rateLimit": {
    "windowMs": 60000,
    "max": 50
  }
}
```

在 TrendMiner 请求体中指定目标群：
```json
{
  "event_type": "tm_trigger",
  "client_payload": {
    "webhook": "production",
    "tm_data": { ... }
  }
}
```

## 测试

### 使用 curl 测试

```bash
curl -X POST \
  https://api.github.com/repos/H4nkX/factorywebhooks/dispatches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "User-Agent: TrendMiner-Webhook" \
  -d '{
    "event_type": "tm_trigger",
    "client_payload": {
      "webhook": "default",
      "tm_data": {
        "monitorId": "test",
        "searchName": "测试消息"
      }
    }
  }'
```

### 本地测试

```bash
npm install
npm start
```

然后发送测试请求：
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"webhook":"default","tm_data":"{\"monitorId\":\"test\",\"searchName\":\"测试\"}"}' \
  http://localhost:3000/
```

## 文件说明

- [index.js](index.js) - Node.js 服务，处理消息并发送到企业微信
- [config.json](config.json) - 多 webhook 配置文件
- [.github/workflows/forward.yml](.github/workflows/forward.yml) - GitHub Actions 工作流
- [setup.html](setup.html) - 配置指南页面

## 常见问题

### 401 错误

确保：
1. GitHub Token 有 `repo` 权限
2. 请求头包含 `Authorization: Bearer YOUR_TOKEN`
`User-Agent: TrendMiner-Webhook`

### Webhook 不存在

检查 `config.json` 中是否配置了对应的 webhook 名称。

## 频率限制

默认配置：每分钟最多 50 条消息，可在 `config.json` 中调整。
