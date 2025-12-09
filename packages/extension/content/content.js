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

  // 简化方案：创建右下角可拖动按钮
  createBottomRightDraggableButton();
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
    'colink-name-side-button-wrapper',
    'colink-topcard-button-wrapper',
    'colink-bottom-right-button-wrapper'
  ];
  
  wrapperIds.forEach(id => {
    const wrapper = document.getElementById(id);
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  });
}

/**
 * 判断是否为 Redwood（Server-Driven UI）Topcard 页面
 */
function isRedwoodTopcard() {
  return !!document.querySelector('[componentkey*="Topcard" i], [componentkey*="top-card" i], [data-view-name*="profile-top-card" i], [data-view-name*="profile-card" i]');
}

function findTopcardContainer() {
  // 优先：完整的 profile-card 容器（若存在）
  let el = document.querySelector('[data-view-name*="profile-card" i]');
  if (el) return el;

  // 其次：Topcard 相关 componentkey（两种拼写）
  el = document.querySelector('[componentkey*="Topcard" i]') || document.querySelector('[componentkey*="top-card" i]');
  if (el) {
    // 尝试提升到含有姓名标题的父容器，保证覆盖范围更大
    const nameEl = document.querySelector('h1.inline, h1[class*="t-24"], h1[class*="text-heading"], h2[class*="f1774190"]');
    let cur = el;
    while (cur && cur !== document.body) {
      if (nameEl && cur.contains(nameEl)) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  // 再次：profile-top-card 派生的 data-view-name
  el = document.querySelector('[data-view-name*="profile-top-card" i]');
  if (el) {
    // 取其包含姓名标题的上层容器
    const nameEl = document.querySelector('h1.inline, h1[class*="t-24"], h1[class*="text-heading"], h2[class*="f1774190"]');
    let cur = el;
    while (cur && cur !== document.body) {
      if (nameEl && cur.contains(nameEl)) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  // 兜底：若头像与姓名都存在，寻找它们的最近公共父容器
  const avatarEl = document.querySelector('[data-view-name*="profile-top-card-member-photo" i] img, img.pv-top-card-profile-picture__image');
  const nameEl = document.querySelector('h1.inline, h1[class*="t-24"], h1[class*="text-heading"], h2[class*="f1774190"]');
  if (avatarEl && nameEl) {
    let cur = avatarEl.closest('section, div');
    while (cur && cur !== document.body) {
      if (cur.contains(nameEl)) return cur;
      cur = cur.parentElement;
    }
  }
  return null;
}

/**
 * Topcard 覆盖按钮（新版/Redwood）：绝对定位在资料卡右上角
 */
function createTopcardOverlayButton() {
  const container = findTopcardContainer();
  if (!container) {
    return false;
  }

  // 确保基础样式已加载
  ensureButtonBaseStyles();

  // 添加样式（只添加一次）
  if (!document.getElementById('colink-topcard-button-style')) {
    const style = document.createElement('style');
    style.id = 'colink-topcard-button-style';
    style.textContent = `
      #colink-topcard-button-wrapper {
        position: absolute !important;
        top: 16px !important;
        right: 16px !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
      }
      @media (max-width: 768px) {
        #colink-topcard-button-wrapper { top: 12px !important; right: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // 让容器成为定位上下文
  const computedStyle = window.getComputedStyle(container);
  if (computedStyle.position === 'static') {
    container.style.position = 'relative';
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

  floatingButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {});
    }
  });

  // 包装器
  const wrapper = document.createElement('div');
  wrapper.id = 'colink-topcard-button-wrapper';
  wrapper.appendChild(floatingButton);

  // 插入容器
  container.appendChild(wrapper);
  return true;
}

/**
 * 头像右侧按钮（固定在头像右边）
 */
function createAvatarSideButton() {
  console.log('CoLink: [DEBUG] 开始查找头像容器...');
  
  // 策略1：通过已知的类名和属性查找（兼容新旧版）
  let avatarContainer = document.querySelector('.pv-top-card__photo-wrapper')
    || document.querySelector('.pv-top-card-profile-picture')
    || document.querySelector('.pv-top-card-profile-picture__container') // 旧版按钮容器
    || document.querySelector('.pv-top-card__profile-photo-container')
    || document.querySelector('.profile-photo-edit__preview')
    || document.querySelector('[data-test-profile-photo-wrapper]')
    || document.querySelector('[data-view-name*="profile-top-card-member-photo"]'); // 新版Redwood
  
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
  
  // 策略2.5：通过特定选择器查找（兼容新旧版）
  if (!avatarContainer) {
    const avatarImgSelectors = [
      'img.pv-top-card-profile-picture__image', // 旧版
      'img.pv-top-card-profile-picture__image--show', // 旧版变体
      'img.profile-photo-edit__preview',
      'img.pv-top-card__photo',
      '[data-view-name*="profile-top-card-member-photo"] img', // 新版Redwood
      'button.pv-top-card-profile-picture__container img', // 旧版按钮内的图片
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
  
  // 查找用户名标题（兼容新旧版）
  const nameElement = document.querySelector('h1.text-heading-xlarge') // 旧版大标题
    || document.querySelector('h1.inline.t-24') // 旧版行内标题
    || document.querySelector('h1[class*="aULtpaWoUDgsIiUDkPhlwLCRuaeg"]') // 旧版特定类名
    || document.querySelector('h2[class*="_770d8f2b"]') // 新版Redwood h2标签
    || document.querySelector('main h1')
    || document.querySelector('main h2')
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
 * 右下角可拖动按钮
 */
function ensureBottomRightButtonStyles() {
  if (document.getElementById('colink-bottom-right-button-style')) return;
  const style = document.createElement('style');
  style.id = 'colink-bottom-right-button-style';
  style.textContent = `
    #colink-bottom-right-button-wrapper {
      position: fixed;
      z-index: 2147483647; /* 始终顶层 */
      user-select: none;
      -webkit-user-select: none;
      touch-action: none; /* 便于拖动 */
    }

    #colink-bottom-right-button-wrapper.dragging {
      cursor: grabbing !important;
    }
  `;
  document.head.appendChild(style);
}

function createBottomRightDraggableButton() {
  ensureButtonBaseStyles();
  ensureBottomRightButtonStyles();

  // 若已存在旧包装器，先清理
  const existing = document.getElementById('colink-bottom-right-button-wrapper');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'colink-bottom-right-button-wrapper';
  wrapper.style.position = 'fixed';
  // 默认放在页面右上角，向下偏移一些
  wrapper.style.right = '24px';
  wrapper.style.top = '64px';
  wrapper.style.zIndex = '2147483647';

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

  let justDragged = false;
  floatingButton.addEventListener('click', (e) => {
    if (justDragged) {
      // 刚刚拖拽结束，抑制一次点击
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {});
    }
  });

  wrapper.appendChild(floatingButton);
  document.body.appendChild(wrapper);

  // 拖拽逻辑（pointer 事件，支持鼠标与触摸）
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let moved = false;

  const onPointerDown = (e) => {
    // 仅左键或触摸
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDragging = true;
    moved = false;
    justDragged = false;
    wrapper.classList.add('dragging');
    const rect = wrapper.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    // 切换为通过 left/top 控制位置
    wrapper.style.setProperty('left', rect.left + 'px', 'important');
    wrapper.style.setProperty('top', rect.top + 'px', 'important');
    wrapper.style.setProperty('right', 'auto', 'important');
    wrapper.style.setProperty('bottom', 'auto', 'important');
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      moved = true;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = wrapper.getBoundingClientRect();
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    // 约束在可视区域内
    const maxLeft = vw - rect.width;
    const maxTop = vh - rect.height;
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));
    wrapper.style.setProperty('left', newLeft + 'px', 'important');
    wrapper.style.setProperty('top', newTop + 'px', 'important');
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('dragging');
    if (moved) {
      // 短暂抑制一次点击
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 120);
    }
  };

  wrapper.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // 兜底：若浏览器将 click 事件目标定向到 wrapper，也进行处理
  wrapper.addEventListener('click', (e) => {
    if (justDragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 只要点击发生在包装器区域（实际只有按钮），都触发打开侧边栏
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, () => {});
    }
  });

  console.log('CoLink: 已创建右下角可拖动按钮');
}

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
