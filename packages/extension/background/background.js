// 后台服务 Worker

// 监听插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEPANEL') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});

console.log('CoLink 后台服务已启动');

