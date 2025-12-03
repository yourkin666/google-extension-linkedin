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
 * 监听来自浮动面板的消息
 */
window.addEventListener('message', (event) => {
  // 面板关闭消息
  if (event.data.type === 'COLINK_PANEL_CLOSED') {
    removeFloatingPanel();
  }
  
  // 打开侧边栏消息（来自浮动面板）
  if (event.data.type === 'COLINK_OPEN_SIDEPANEL') {
    console.log('CoLink: 收到打开侧边栏请求', event.data);
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ 
        type: 'OPEN_SIDEPANEL',
        tab: event.data.tab 
      });
    }
  }
});

/**
 * 创建浮动按钮（固定在头像旁边）
 */
let floatingButton = null;
let retryCount = 0;
const MAX_RETRY = 10;

function createFloatingButton() {
  // 如果按钮已存在，不重复创建
  if (floatingButton && document.body.contains(floatingButton)) {
    console.log('CoLink: 按钮已存在');
    return;
  }

  // 等待LinkedIn页面加载完成，找到插入位置
  const insertButton = () => {
    retryCount++;
    
    if (retryCount > MAX_RETRY) {
      console.error('CoLink: 无法找到合适的插入位置');
      return;
    }

    // 多种可能的选择器，按优先级尝试
    const selectors = [
      '.pv-top-card__profile-photo-container', // 头像容器
      '.pv-top-card-profile-picture', // 头像
      'img[loading="lazy"].pv-top-card-profile-picture__image', // 头像图片
      '.ph5.pb5', // 个人资料头部
      '.pv-text-details__left-panel', // 文字详情左侧面板
    ];

    let targetContainer = null;
    for (const selector of selectors) {
      targetContainer = document.querySelector(selector);
      if (targetContainer) {
        console.log('CoLink: 找到目标容器:', selector);
        break;
      }
    }

    if (!targetContainer) {
      console.log('CoLink: 未找到目标容器，重试中...', retryCount);
      setTimeout(insertButton, 500);
      return;
    }

    // 添加样式（只添加一次）
    if (!document.getElementById('colink-button-style')) {
      const style = document.createElement('style');
      style.id = 'colink-button-style';
      style.textContent = `
        #colink-similarity-button-wrapper {
          position: absolute;
          top: 0;
          left: 180px;
          z-index: 1000;
        }

        .colink-similarity-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #0a66c2;
          color: white;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(10, 102, 194, 0.3);
          white-space: nowrap;
        }

        .colink-similarity-button:hover {
          background: #004182;
          box-shadow: 0 4px 12px rgba(10, 102, 194, 0.4);
          transform: translateY(-1px);
        }

        .colink-similarity-button:active {
          transform: translateY(0);
        }

        .colink-similarity-button svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        @keyframes colink-fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .colink-similarity-button {
          animation: colink-fade-in 0.3s ease-out;
        }

        /* 如果头像容器没有 position，给它添加 */
        .pv-top-card__profile-photo-container,
        .pv-top-card-profile-picture {
          position: relative !important;
        }
      `;
      document.head.appendChild(style);
    }

    // 创建按钮元素
    floatingButton = document.createElement('button');
    floatingButton.id = 'colink-floating-button';
    floatingButton.className = 'colink-similarity-button';
    floatingButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>CoLink找相似</span>
    `;

    // 点击事件
    floatingButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('CoLink: 点击找相似按钮');
      
      // 发送消息给 background script 打开侧边栏
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('CoLink: 发送消息失败', chrome.runtime.lastError);
          } else {
            console.log('CoLink: 消息已发送，响应：', response);
          }
        });
      } else {
        console.error('CoLink: 扩展上下文失效，请刷新页面');
      }
    });

    // 创建包装器
    const buttonWrapper = document.createElement('div');
    buttonWrapper.id = 'colink-similarity-button-wrapper';
    buttonWrapper.appendChild(floatingButton);

    // 确保目标容器有相对定位
    if (targetContainer && window.getComputedStyle(targetContainer).position === 'static') {
      targetContainer.style.position = 'relative';
    }

    // 插入按钮
    if (targetContainer) {
      targetContainer.appendChild(buttonWrapper);
      console.log('CoLink: 找相似按钮已成功添加到页面');
    } else {
      console.error('CoLink: 无法插入按钮，目标容器为空');
    }
  };

  // 重置重试计数
  retryCount = 0;
  // 开始插入按钮
  insertButton();
}

/**
 * 移除浮动按钮
 */
function removeFloatingButton() {
  if (floatingButton) {
    // 找到按钮的父容器（wrapper）并移除
    const wrapper = floatingButton.parentNode;
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    } else if (floatingButton.parentNode) {
      floatingButton.parentNode.removeChild(floatingButton);
    }
    floatingButton = null;
    console.log('CoLink: 找相似按钮已移除');
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

