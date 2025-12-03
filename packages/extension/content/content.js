// Content Script - 在 LinkedIn 页面中运行

/**
 * 检查当前页面是否是 LinkedIn 个人主页
 * @returns {string|null} 返回 username 或 null
 */
function extractLinkedInUsername() {
  const url = window.location.href;
  const pattern = /linkedin\.com\/in\/([^\/\?]+)/;
  const match = url.match(pattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

/**
 * 向 sidepanel 发送当前页面信息
 */
function notifySidePanel() {
  const username = extractLinkedInUsername();
  
  // 检查扩展上下文是否有效
  if (!chrome.runtime?.id) {
    console.log('CoLink: 扩展已重新加载，请刷新页面');
    return;
  }
  
  try {
    // 存储当前 username 到 chrome.storage
    chrome.storage.local.set({ 
      currentUsername: username,
      currentUrl: window.location.href 
    });
  } catch (error) {
    // 扩展上下文失效时忽略错误
    console.log('CoLink: 扩展上下文失效，请刷新页面');
  }
}

// 页面加载完成后检测
notifySidePanel();

// 监听 URL 变化（LinkedIn 是 SPA）
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    notifySidePanel();
  }
}).observe(document, { subtree: true, childList: true });

console.log('CoLink Content Script 已加载');

