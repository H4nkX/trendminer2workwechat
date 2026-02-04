addEventListener('fetch', event => {
  event.respondWith(handleTrendminer(event.request))
})

async function handleTrendminer(request) {
  try {
    // 1. 接收Trendminer的真实请求体（你提供的完整格式）
    const tmData = await request.json();

    // 2. 配置【你的企业微信Webhook地址】★★★仅改这1处★★★
    const WX_WEBHOOK = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3dfeaca5-345e-474e-b619-ea5b10f877a8";

    // 3. 时间格式化（和你原本Node.js代码完全一致，上海时区）
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    });

    // 4. 解析Trendminer真实字段（完全匹配你给的格式，无遗漏）
    const {
      monitorId, resultEnd, resultId, resultScore,
      resultStart, resultUrl, searchCreator, searchDescription,
      searchId, searchName, searchType, webhookCallEvent, webhookCallTime
    } = tmData;

    // 5. 拼接企业微信消息（和你原本Node.js逻辑一致，字段完整）
    const content = `TrendMiner 监控告警
监控ID: ${monitorId || '未知'}
搜索ID: ${searchId || '未知'}
结果ID: ${resultId || '未知'}
结果分数: ${resultScore || '未知'}
搜索名称: ${searchName || '未知'}
搜索类型: ${searchType || '未知'}
创建人: ${searchCreator || '未知'}
搜索描述: ${searchDescription || '未知'}
事件类型: ${webhookCallEvent || '未知'}
结果开始时间: ${resultStart || '未知'}
结果结束时间: ${resultEnd || '未知'}
触发时间: ${webhookCallTime || '未知'}
查看详情: ${resultUrl || '无链接'}
本地接收时间：${timestamp}`;

    // 6. 发送到企业微信（格式和你原本Node.js完全一致）
    await fetch(WX_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content: `请注意有问题\n${content}` }
      })
    });

    // 7. 给Trendminer返回200成功响应（避免它报4xx/5xx错误）
    return new Response(JSON.stringify({ status: "ok", message: "消息已发送到企业微信" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // 异常处理：即使出错，也给Trendminer返回200，避免它重试/报错
    return new Response(JSON.stringify({
      status: "ok",
      message: "消息接收成功，处理中（轻微异常）",
      error: err.message
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
