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

// 确保按钮基础样式已注入
function ensureButtonBaseStyles() {
  if (document.getElementById('colink-button-style')) return;
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
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 10px 16px !important;
      background: #0a66c2 !important;
      color: white !important;
      border: none !important;
      border-radius: 24px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(10, 102, 194, 0.3) !important;
      white-space: nowrap !important;
      line-height: normal !important;
      text-decoration: none !important;
      outline: none !important;
    }

    .colink-similarity-button:hover {
      background: #004182 !important;
      box-shadow: 0 4px 12px rgba(10, 102, 194, 0.4) !important;
      transform: translateY(-1px) !important;
    }

    .colink-similarity-button:active {
      transform: translateY(0) !important;
    }

    .colink-similarity-button svg {
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
      fill: none !important;
      stroke: currentColor !important;
    }

    .colink-similarity-button span {
      color: white !important;
      font-size: 14px !important;
      font-weight: 600 !important;
    }

    @keyframes colink-fade-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    .colink-similarity-button { animation: colink-fade-in 0.3s ease-out; }

    .pv-top-card__profile-photo-container,
    .pv-top-card-profile-picture { position: relative !important; }
  `;
  document.head.appendChild(style);
  console.log('CoLink: [DEBUG] 按钮基础样式已注入');
}

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
    const htmlText = await response.text();

    // 仅提取面板主体，避免把页面内的 <script> 标签注入导致 chrome-extension://invalid 报错
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    let panelContent = '';
    const panelRoot = doc.getElementById('colink-floating-panel');
    if (panelRoot) {
      panelContent = panelRoot.outerHTML;
    } else {
      // 兜底：移除 body 内的 <script> 标签
      doc.querySelectorAll('script').forEach(el => el.remove());
      panelContent = doc.body.innerHTML;
    }
    
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
 * 创建浮动按钮（头像右侧）
 */
let floatingButton = null;
let buttonRetryCount = 0;
const MAX_BUTTON_RETRY = 10;

function createFloatingButton() {
  // 如果按钮已存在，不重复创建
  if (floatingButton && document.body.contains(floatingButton)) {
    console.log('CoLink: 按钮已存在');
    return;
  }

  // 尝试创建头像右侧按钮
  const insertButton = () => {
    buttonRetryCount++;
    
    if (buttonRetryCount > MAX_BUTTON_RETRY) {
      console.log('CoLink: 达到最大重试次数，尝试备选位置');
      // 备选方案：放在用户名旁边
      const fallbackSuccess = createNameSideButton();
      if (!fallbackSuccess) {
        console.error('CoLink: 所有按钮放置策略都失败了');
      }
      return;
    }

    const success = createAvatarSideButton();
    if (success) {
      console.log('CoLink: 按钮已成功创建在头像右侧');
      return;
    }

    // 重试
    console.log('CoLink: 头像未找到，重试中...', buttonRetryCount);
    setTimeout(insertButton, 500);
  };

  buttonRetryCount = 0;
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

  // 清理所有可能的按钮包装器
  const wrapperIds = [
    'colink-avatar-side-button-wrapper',
    'colink-name-side-button-wrapper'
  ];
  
  wrapperIds.forEach(id => {
    const wrapper = document.getElementById(id);
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  });
}

/**
 * 头像右侧按钮（固定在头像右边）
 */
function createAvatarSideButton() {
  console.log('CoLink: [DEBUG] 开始查找头像容器...');
  
  // 策略1：通过已知的类名查找
  let avatarContainer = document.querySelector('.pv-top-card__photo-wrapper')
    || document.querySelector('.pv-top-card-profile-picture')
    || document.querySelector('.pv-top-card__profile-photo-container')
    || document.querySelector('.profile-photo-edit__preview')
    || document.querySelector('[data-test-profile-photo-wrapper]');
  
  console.log('CoLink: [DEBUG] 策略1结果:', avatarContainer);

  // 策略2：查找圆形头像（通过样式判断）
  if (!avatarContainer) {
    console.log('CoLink: [DEBUG] 策略2：查找圆形头像...');
    const allImages = document.querySelectorAll('img');
    
    for (const img of allImages) {
      // 跳过封面照片
      const alt = img.getAttribute('alt') || '';
      if (alt.includes('封面') || alt.includes('banner') || alt.includes('background') || alt.includes('cover')) {
        continue;
      }
      
      // 检查图片或其容器是否有圆形样式
      const imgStyle = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      
      // 圆形图片特征：
      // 1. border-radius >= 50%
      // 2. 方形（宽高相近）
      // 3. 尺寸在 100-300px 之间
      const borderRadius = imgStyle.borderRadius;
      const isCircular = borderRadius.includes('50%') || borderRadius.includes('9999') || parseFloat(borderRadius) >= rect.width / 2;
      const isSquare = Math.abs(rect.width - rect.height) < 20;
      const isRightSize = rect.width >= 100 && rect.width <= 300;
      
      if (isCircular && isSquare && isRightSize) {
        console.log('CoLink: [DEBUG] 找到圆形头像:', img, {
          borderRadius,
          width: rect.width,
          height: rect.height,
          alt
        });
        
        avatarContainer = img.closest('button') || img.closest('div');
        if (avatarContainer) {
          console.log('CoLink: [DEBUG] 找到圆形头像的容器:', avatarContainer);
          break;
        }
      }
    }
  }
  
  // 策略2.5：通过特定选择器查找
  if (!avatarContainer) {
    const avatarImgSelectors = [
      'img.pv-top-card-profile-picture__image',
      'img.profile-photo-edit__preview',
      'img.pv-top-card__photo',
      'button img[width="200"]',
      'main img[width="200"]'
    ];
    
    for (const selector of avatarImgSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        console.log('CoLink: [DEBUG] 通过选择器找到图片:', selector, img);
        avatarContainer = img.closest('button') || img.closest('div[class*="photo"]') || img.closest('div');
        if (avatarContainer) {
          console.log('CoLink: [DEBUG] 找到图片的容器:', avatarContainer);
          break;
        }
      }
    }
  }

  // 策略3：在主卡片区域查找第一个大尺寸图片
  if (!avatarContainer) {
    console.log('CoLink: [DEBUG] 策略3：在主卡片区域查找...');
    const mainCard = document.querySelector('main') || document.querySelector('.scaffold-layout__main') || document.querySelector('#main');
    if (mainCard) {
      const images = mainCard.querySelectorAll('img');
      for (const img of images) {
        const rect = img.getBoundingClientRect();
        // 查找大约 200x200 左右的图片（头像通常是这个尺寸）
        if (rect.width >= 150 && rect.width <= 250 && rect.height >= 150 && rect.height <= 250) {
          console.log('CoLink: [DEBUG] 找到可能的头像图片（按尺寸）:', img, rect);
          avatarContainer = img.closest('button') || img.closest('div');
          if (avatarContainer) break;
        }
      }
    }
  }

  if (!avatarContainer) {
    console.log('CoLink: [DEBUG] 所有策略都未找到头像容器');
    console.log('CoLink: [DEBUG] 页面主要元素:', {
      main: !!document.querySelector('main'),
      images: document.querySelectorAll('img').length,
      buttons: document.querySelectorAll('button').length
    });
    return false;
  }

  console.log('CoLink: 找到头像容器', avatarContainer);

  // 确保基础样式已加载
  ensureButtonBaseStyles();

  // 添加按钮专属样式（只添加一次）
  if (!document.getElementById('colink-avatar-side-button-style')) {
    const style = document.createElement('style');
    style.id = 'colink-avatar-side-button-style';
    style.textContent = `
      #colink-avatar-side-button-wrapper {
        position: absolute !important;
        left: calc(100% + 16px) !important;
        top: 80% !important;
        transform: translateY(-50%) !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
      }
      
      /* 确保头像容器有相对定位 */
      .pv-top-card__photo-wrapper,
      .pv-top-card-profile-picture,
      .pv-top-card__profile-photo-container {
        position: relative !important;
      }
      
      /* 响应式：小屏幕时放在头像下方 */
      @media (max-width: 768px) {
        #colink-avatar-side-button-wrapper {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          margin-top: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 确保头像容器有相对定位
  const computedStyle = window.getComputedStyle(avatarContainer);
  if (computedStyle.position === 'static') {
    avatarContainer.style.position = 'relative';
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
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {});
    }
  });

  // 创建包装器
  const wrapper = document.createElement('div');
  wrapper.id = 'colink-avatar-side-button-wrapper';
  wrapper.appendChild(floatingButton);

  // 插入到头像容器内
  avatarContainer.appendChild(wrapper);

  console.log('CoLink: 按钮已创建在头像右侧');
  return true;
}

/**
 * 备选方案：用户名右侧按钮
 */
function createNameSideButton() {
  console.log('CoLink: [DEBUG] 尝试备选方案：用户名右侧');
  
  // 查找用户名标题
  const nameElement = document.querySelector('h1.text-heading-xlarge')
    || document.querySelector('main h1')
    || document.querySelector('h1[class*="heading"]')
    || document.querySelector('.pv-text-details__left-panel h1');
    
  if (!nameElement) {
    console.log('CoLink: [DEBUG] 未找到用户名元素');
      return false;
  }

  console.log('CoLink: [DEBUG] 找到用户名元素:', nameElement);
  
  // 确保基础样式已加载
  ensureButtonBaseStyles();

  // 添加样式
  if (!document.getElementById('colink-name-side-button-style')) {
    const style = document.createElement('style');
    style.id = 'colink-name-side-button-style';
    style.textContent = `
      #colink-name-side-button-wrapper {
        display: inline-block !important;
        margin-left: 12px !important;
        vertical-align: middle !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 创建按钮
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

  floatingButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {});
    }
  });

  // 创建包装器
  const wrapper = document.createElement('span');
  wrapper.id = 'colink-name-side-button-wrapper';
  wrapper.appendChild(floatingButton);

  // 插入到用户名后面
  nameElement.parentNode.insertBefore(wrapper, nameElement.nextSibling);

  console.log('CoLink: 按钮已创建在用户名右侧（备选方案）');
  return true;
}

// 已删除：createTitleAnchoredButton、createHeadlineAnchoredButton、createAvatarAnchoredButton
// 现在只使用可拖动的右下角按钮

/**
 * 强制显示浮动按钮（用于侧边栏关闭后）
 */
function forceShowFloatingButton() {
  const username = extractLinkedInUsername();
  if (username) {
    // 先移除旧按钮（如果存在）
    removeFloatingButton();
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
