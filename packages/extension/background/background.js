// 后台服务 Worker

// 监听插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ windowId: tab.windowId })
    .then(() => {
      console.log('侧边栏已打开（通过图标点击）');
      // 通知 content script 侧边栏已打开
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'SIDEPANEL_OPENED' 
        }).catch(() => {});
      }
    })
    .catch((error) => {
      console.error('打开侧边栏失败：', error);
    });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息：', message);
  
  if (message.type === 'OPEN_SIDEPANEL') {
    if (sender.tab && sender.tab.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(() => {
          console.log('侧边栏已打开（通过浮动按钮）');
          
          // 通知 content script 侧边栏已打开
          chrome.tabs.sendMessage(sender.tab.id, { 
            type: 'SIDEPANEL_OPENED' 
          }).catch(() => {});
          
          // 如果指定了要打开的标签页，稍后发送消息给侧边栏
          if (message.tab) {
            // 延迟一点发送，确保侧边栏已加载
            setTimeout(() => {
              chrome.runtime.sendMessage({
                type: 'SWITCH_SIDEPANEL_TAB',
                tab: message.tab
              }).catch(err => {
                // 如果侧边栏尚未打开或无法接收消息，可能会报错，这里忽略或记录
                console.log('发送切换标签消息失败（可能是侧边栏刚启动）:', err);
              });
            }, 300);
          }
          
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('打开侧边栏失败：', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 保持消息通道开启以支持异步响应
    } else {
      console.error('无法获取 tab 信息');
      sendResponse({ success: false, error: '无法获取 tab 信息' });
    }
  }
  
  // 转发侧边栏关闭消息给 content script
  if (message.type === 'SIDEPANEL_CLOSED_FROM_PANEL') {
    chrome.tabs.query({ url: "https://www.linkedin.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'SIDEPANEL_CLOSED' }).catch(() => {
          // 忽略错误
        });
      });
    });
  }
});

console.log('CoLink 后台服务已启动');

