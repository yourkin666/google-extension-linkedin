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

/**
 * 浮动面板相关
 */
let floatingPanelContainer = null;
let floatingPanelVisible = false;

/**
 * 创建浮动面板
 */
async function createFloatingPanel() {
  // 如果面板已存在，不重复创建
  if (floatingPanelContainer) {
    return;
  }

  try {
    // 检查CSS是否已加载
    if (!document.getElementById('colink-panel-css')) {
      const cssLink = document.createElement('link');
      cssLink.id = 'colink-panel-css';
      cssLink.rel = 'stylesheet';
      cssLink.type = 'text/css';
      cssLink.href = chrome.runtime.getURL('floating-panel/floating-panel.css');
      document.head.appendChild(cssLink);
    }
    
    // 检查LinkedIn数据抓取脚本是否已加载
    if (!document.getElementById('colink-scraper-script')) {
      const scraperScript = document.createElement('script');
      scraperScript.id = 'colink-scraper-script';
      scraperScript.src = chrome.runtime.getURL('utils/linkedin-scraper.js');
      document.head.appendChild(scraperScript);
    }
    
    // 等待脚本加载
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 加载HTML内容
    const htmlUrl = chrome.runtime.getURL('floating-panel/floating-panel.html');
    const response = await fetch(htmlUrl);
    let htmlText = await response.text();
    
    // 移除HTML中的head标签和body标签，只保留内容
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const panelContent = doc.body.innerHTML;
    
    // 创建容器
    floatingPanelContainer = document.createElement('div');
    floatingPanelContainer.id = 'colink-floating-panel-container';
    floatingPanelContainer.innerHTML = panelContent;
    
    // 添加到页面
    document.body.appendChild(floatingPanelContainer);
    floatingPanelVisible = true;
    
    // 延迟加载浮动面板逻辑脚本（只加载一次）
    if (!document.getElementById('colink-panel-script')) {
      const panelScript = document.createElement('script');
      panelScript.id = 'colink-panel-script';
      panelScript.src = chrome.runtime.getURL('floating-panel/floating-panel.js');
      document.head.appendChild(panelScript);
    }
    
    console.log('CoLink: 浮动面板已创建');
  } catch (error) {
    console.error('CoLink: 创建浮动面板失败', error);
  }
}

/**
 * 移除浮动面板
 */
function removeFloatingPanel() {
  if (floatingPanelContainer && floatingPanelContainer.parentNode) {
    floatingPanelContainer.parentNode.removeChild(floatingPanelContainer);
    floatingPanelContainer = null;
    floatingPanelVisible = false;
    console.log('CoLink: 浮动面板已移除');
  }
}

/**
 * 监听来自浮动面板的关闭消息
 */
window.addEventListener('message', (event) => {
  if (event.data.type === 'COLINK_PANEL_CLOSED') {
    removeFloatingPanel();
  }
});

/**
 * 创建浮动按钮
 */
let floatingButton = null;

function createFloatingButton() {
  // 如果按钮已存在，不重复创建
  if (floatingButton) {
    return;
  }

  // 创建按钮元素
  floatingButton = document.createElement('div');
  floatingButton.id = 'colink-floating-button';
  floatingButton.innerHTML = `
    <div class="colink-button-content">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>CoLink找相似</span>
    </div>
  `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #colink-floating-button {
      position: fixed;
      bottom: 80px;
      right: 16px;
      padding: 8px 14px;
      background: #0a66c2;
      border-radius: 20px;
      box-shadow: 0 3px 12px rgba(10, 102, 194, 0.4);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      animation: colink-slide-in 0.5s ease-out;
    }

    #colink-floating-button:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 5px 16px rgba(10, 102, 194, 0.5);
    }

    #colink-floating-button:active {
      transform: translateY(-1px) scale(1.01);
    }

    .colink-button-content {
      display: flex;
      align-items: center;
      gap: 5px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      white-space: nowrap;
    }

    .colink-button-content svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    @keyframes colink-slide-in {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes colink-slide-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100px);
      }
    }

    #colink-floating-button.colink-hiding {
      animation: colink-slide-out 0.3s ease-in forwards;
    }
  `;

  // 添加点击事件
  floatingButton.addEventListener('click', () => {
    console.log('CoLink: 点击浮动按钮');
    
    // 发送消息给 background script 打开侧边栏
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('CoLink: 发送消息失败', chrome.runtime.lastError);
        } else {
          console.log('CoLink: 消息已发送，响应：', response);
          // 侧边栏成功打开后，隐藏按钮
          if (response && response.success) {
            removeFloatingButton();
          }
        }
      });
    } else {
      console.error('CoLink: 扩展上下文失效，请刷新页面');
    }
  });

  // 将样式和按钮添加到页面
  document.head.appendChild(style);
  document.body.appendChild(floatingButton);
}

/**
 * 移除浮动按钮
 */
function removeFloatingButton() {
  if (floatingButton) {
    floatingButton.classList.add('colink-hiding');
    setTimeout(() => {
      if (floatingButton && floatingButton.parentNode) {
        floatingButton.parentNode.removeChild(floatingButton);
      }
      floatingButton = null;
    }, 300); // 等待动画完成
  }
}

/**
 * 强制显示浮动按钮（用于侧边栏关闭后）
 */
function forceShowFloatingButton() {
  const username = extractLinkedInUsername();
  if (username) {
    // 先移除旧按钮（如果存在）
    if (floatingButton && floatingButton.parentNode) {
      floatingButton.parentNode.removeChild(floatingButton);
      floatingButton = null;
    }
    // 创建新按钮
    createFloatingButton();
  }
}

/**
 * 更新浮动按钮和面板显示状态
 */
function updateFloatingButtonVisibility() {
  const username = extractLinkedInUsername();
  
  if (username) {
    // 在用户主页，显示按钮和面板
    if (!floatingButton) {
      createFloatingButton();
    }
    // 自动显示浮动面板
    if (!floatingPanelVisible) {
      createFloatingPanel();
    }
  } else {
    // 不在用户主页，隐藏按钮和面板
    removeFloatingButton();
    removeFloatingPanel();
  }
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIDEPANEL_CLOSED') {
    console.log('CoLink: 侧边栏已关闭，重新显示按钮');
    // 延迟一点以确保侧边栏完全关闭
    setTimeout(() => {
      forceShowFloatingButton();
    }, 100);
    
    // 通知浮动窗口侧边栏已关闭
    window.postMessage({ 
      type: 'COLINK_SIDEPANEL_STATUS', 
      isOpen: false 
    }, '*');
  }
  
  if (message.type === 'SIDEPANEL_OPENED') {
    console.log('CoLink: 侧边栏已打开');
    // 通知浮动窗口侧边栏已打开
    window.postMessage({ 
      type: 'COLINK_SIDEPANEL_STATUS', 
      isOpen: true 
    }, '*');
  }
});

// 页面加载完成后检测
notifySidePanel();
updateFloatingButtonVisibility();

// 监听 URL 变化（LinkedIn 是 SPA）
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    notifySidePanel();
    updateFloatingButtonVisibility();
    
    // 通知浮动面板URL已变化，需要重新加载数据
    const username = extractLinkedInUsername();
    if (username && floatingPanelVisible) {
      console.log('CoLink: URL变化，通知浮动面板重新加载数据');
      window.postMessage({ 
        type: 'COLINK_URL_CHANGED',
        url: currentUrl,
        username: username
      }, '*');
    }
  }
}).observe(document, { subtree: true, childList: true });

console.log('CoLink Content Script 已加载');

