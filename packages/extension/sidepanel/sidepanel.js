// 非模块化版本 - 依赖全局函数（从 api.js 和 storage.js 加载）
// 需要确保 HTML 中先加载 storage.js 和 api.js

// 状态管理
let currentUsername = null;
let similarUsers = [];
let currentIndex = 0;
let isSearching = false; // 标记是否正在筛选中

// DOM 元素
const elements = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  mainTab: document.getElementById('main-tab'),
  favoritesTab: document.getElementById('favorites-tab'),
  
  // Status
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  notProfile: document.getElementById('not-profile'),
  authRequired: document.getElementById('auth-required'),
  readyToStart: document.getElementById('ready-to-start'),
  
  // Stats
  stats: document.getElementById('stats'),
  pendingCount: document.getElementById('pending-count'),
  favoriteCount: document.getElementById('favorite-count'),
  
  // Current User
  currentUser: document.getElementById('current-user'),
  
  // Buttons
  btnStartSearch: document.getElementById('btn-start-search'),
  btnSkip: document.getElementById('btn-skip'),
  btnLike: document.getElementById('btn-like'),
  btnStop: document.getElementById('btn-stop'),
  btnLoginNow: document.getElementById('btn-login-now'),
  authRequiredFav: document.getElementById('auth-required-fav'),
  btnLoginNowFav: document.getElementById('btn-login-now-fav'),
  authInfo: document.getElementById('auth-info'),
  authEmail: document.getElementById('auth-email'),
  authAvatar: document.getElementById('auth-avatar'),
  authLogout: document.getElementById('auth-logout'),
  
  // Favorites
  favoritesList: document.getElementById('favorites-list'),
  favoritesEmpty: document.getElementById('favorites-empty'),
};

// 初始化
async function init() {
  setupEventListeners();
  await checkCurrentPage();
  await updateStats();
  await updateAuthUI();
}

// 设置事件监听
function setupEventListeners() {
  // 监听来自 background 的消息（例如切换 Tab）
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SWITCH_SIDEPANEL_TAB' && message.tab) {
      console.log('收到切换标签请求:', message.tab);
      switchTab(message.tab);
    }
  });

  // Tab 切换
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // 操作按钮
  elements.btnStartSearch.addEventListener('click', handleStartSearch);
  elements.btnSkip.addEventListener('click', handleSkip);
  elements.btnLike.addEventListener('click', handleLike);
  elements.btnStop.addEventListener('click', handleStop);
  if (elements.btnLoginNow) {
    elements.btnLoginNow.addEventListener('click', async () => {
      try {
        await loginWithGoogle();
        await updateAuthUI();
        await checkCurrentPage();
      } catch (e) {
        console.error('登录失败:', e);
        alert('登录失败，请重试');
      }
    });
  }
  if (elements.btnLoginNowFav) {
    elements.btnLoginNowFav.addEventListener('click', async () => {
      try {
        await loginWithGoogle();
        await updateAuthUI();
        await loadFavorites();
      } catch (e) {
        console.error('登录失败:', e);
        alert('登录失败，请重试');
      }
    });
  }
  if (elements.authLogout) {
    elements.authLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logout();
        await updateAuthUI();
        await checkCurrentPage();
        // 若当前在收藏页，刷新收藏列表以更新按钮禁用状态
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.tab === 'favorites') {
          await loadFavorites();
        }
      } catch (err) {
        console.error('退出失败:', err);
      }
    });
  }
  
  // 监听 storage 变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentUsername) {
      // 只有在非筛选状态下才响应 URL 变化
      if (!isSearching) {
        checkCurrentPage();
      }
    }
    if (changes.supabaseSession) {
      updateAuthUI();
      if (!isSearching) {
        checkCurrentPage();
      }
    }
  });
}

// 更新认证按钮状态
async function updateAuthUI() {
  try {
    const session = await getSession();
    if (session && session.access_token) {
      if (elements.btnStartSearch) {
        elements.btnStartSearch.disabled = false;
        elements.btnStartSearch.title = '';
      }
      // 展示邮箱与头像
      const info = extractUserInfo(session);
      if (elements.authInfo) {
        elements.authInfo.style.display = 'flex';
      }
      if (elements.authEmail) {
        elements.authEmail.textContent = info.email || '已登录';
      }
      if (elements.authAvatar) {
        if (info.avatar_url) {
          elements.authAvatar.src = info.avatar_url;
          elements.authAvatar.style.display = 'block';
        } else {
          elements.authAvatar.style.display = 'none';
        }
      }
      // 隐藏收藏页未登录提示
      if (elements.authRequiredFav) {
        elements.authRequiredFav.style.display = 'none';
      }
      // 启用收藏页操作按钮
      updateFavoritesActionsState(true);
    } else {
      if (elements.btnStartSearch) {
        elements.btnStartSearch.disabled = true;
        elements.btnStartSearch.title = '请先登录';
      }
      if (elements.authInfo) {
        elements.authInfo.style.display = 'none';
      }
      // 显示收藏页未登录提示
      if (elements.authRequiredFav) {
        elements.authRequiredFav.style.display = 'block';
      }
      // 禁用收藏页操作按钮
      updateFavoritesActionsState(false);
    }
  } catch {}
}

// 根据登录状态启用/禁用收藏页内的操作
function updateFavoritesActionsState(isLoggedIn) {
  const visitBtns = document.querySelectorAll('.btn-visit');
  const removeBtns = document.querySelectorAll('.btn-remove');
  visitBtns.forEach(btn => {
    btn.disabled = !isLoggedIn;
    btn.title = isLoggedIn ? '' : '请先登录';
  });
  removeBtns.forEach(btn => {
    btn.disabled = !isLoggedIn;
    btn.title = isLoggedIn ? '' : '请先登录';
  });
}

// 从 session 或 JWT 中解析用户信息
function extractUserInfo(session) {
  const info = { email: '', avatar_url: '' };
  // 优先使用 session.user
  const user = session && session.user || null;
  if (user) {
    info.email = user.email || '';
    const meta = user.user_metadata || user.identities?.[0]?.identity_data || {};
    info.avatar_url = meta.avatar_url || meta.picture || '';
    if (info.email && info.avatar_url) return info;
  }
  // 解析 JWT
  try {
    const token = session && session.access_token;
    if (!token) return info;
    const parts = token.split('.');
    if (parts.length !== 3) return info;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    info.email = payload.email || payload.user_email || info.email;
    const um = payload.user_metadata || {};
    info.avatar_url = um.avatar_url || payload.picture || info.avatar_url;
  } catch (e) {}
  return info;
}

// 切换 Tab
async function switchTab(tabName) {
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  if (tabName === 'main') {
    elements.mainTab.classList.add('active');
    elements.favoritesTab.classList.remove('active');
  } else if (tabName === 'favorites') {
    elements.mainTab.classList.remove('active');
    elements.favoritesTab.classList.add('active');
    await loadFavorites();
  }
  await updateAuthUI();
}

// 检查当前页面
async function checkCurrentPage() {
  const result = await chrome.storage.local.get('currentUsername');
  currentUsername = result.currentUsername;
  const session = await getSession();
  
  if (!currentUsername) {
    showNotProfile();
  } else if (!session) {
    // 未登录：展示登录提示卡片
    showAuthRequired();
  } else {
    // 已登录：显示"找相似"按钮，等待用户点击
    showReadyToStart();
  }
}

// 显示"待开始"状态
function showReadyToStart() {
  hideAllStatus();
  elements.readyToStart.style.display = 'block';
  elements.stats.style.display = 'none';
  elements.currentUser.style.display = 'none';
  // 根据登录状态更新按钮可用性
  if (typeof updateAuthUI === 'function') {
    updateAuthUI();
  }
}

// 开始搜索相似用户
async function handleStartSearch() {
  const session = await getSession();
  if (!session) {
    alert('请先登录');
    await updateAuthUI();
    return;
  }
  if (currentUsername) {
    isSearching = true; // 开始筛选
    await loadSimilarUsers(currentUsername);
  }
}

// 显示"非个人主页"提示
function showNotProfile() {
  hideAllStatus();
  elements.notProfile.style.display = 'block';
  elements.stats.style.display = 'none';
  elements.currentUser.style.display = 'none';
}

// 显示加载中
function showLoading() {
  hideAllStatus();
  elements.loading.style.display = 'block';
}

// 显示错误
function showError(message) {
  hideAllStatus();
  elements.error.style.display = 'block';
  elements.errorMessage.textContent = message;
}

// 隐藏所有状态
function hideAllStatus() {
  elements.loading.style.display = 'none';
  elements.error.style.display = 'none';
  elements.notProfile.style.display = 'none';
  if (elements.authRequired) elements.authRequired.style.display = 'none';
  elements.readyToStart.style.display = 'none';
}

// 显示未登录提示
function showAuthRequired() {
  hideAllStatus();
  if (elements.authRequired) {
    elements.authRequired.style.display = 'block';
  }
  if (elements.btnStartSearch) {
    elements.btnStartSearch.disabled = true;
    elements.btnStartSearch.title = '请先登录';
  }
}

// 加载相似用户
async function loadSimilarUsers(username, append = false) {
  try {
    // 累加模式不显示加载状态（后台静默进行）
    if (!append) {
      showLoading();
    }
    
    const data = await getSimilarUsers(username);
    const newUsers = data.similarProfiles || [];
    
    if (append) {
      // 累加模式：去重后添加到现有列表
      const existingIds = new Set(similarUsers.map(u => u.publicIdentifier));
      const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.publicIdentifier));
      similarUsers = [...similarUsers, ...uniqueNewUsers];
      console.log(`✅ 累加 ${uniqueNewUsers.length} 个新用户，总共 ${similarUsers.length} 个待筛选`);
      
      // 累加模式只更新统计，不改变界面状态
      await updateStats();
      return;
    } else {
      // 初始模式：替换列表
      similarUsers = newUsers;
      currentIndex = 0;
    }
    
    if (similarUsers.length === 0) {
      showError('没有找到相似用户 😢');
      return;
    }
    
    hideAllStatus();
    elements.stats.style.display = 'flex';
    elements.currentUser.style.display = 'block';
    
    await updateStats();
    showCurrentUser();
    
  } catch (error) {
    console.error('加载相似用户失败:', error);
    
    // 累加模式失败时，静默失败，不显示UI错误
    if (append) {
      console.log('⚠️ 累加失败，继续流程');
      return;
    }
    
    // 初始模式失败时才显示错误
    showError(error?.message || '加载失败，请检查后端服务是否运行 🔧');
  }
}

// 显示当前用户
function showCurrentUser() {
  if (currentIndex >= similarUsers.length) {
    showError('🎉 所有推荐已看完！');
    elements.stats.style.display = 'none';
    elements.currentUser.style.display = 'none';
    return;
  }
  
  // 更新待筛选数量
  elements.pendingCount.textContent = similarUsers.length - currentIndex;
  
  // 跳转到当前用户的 LinkedIn 页面
  const currentUser = similarUsers[currentIndex];
  if (currentUser && currentUser.publicIdentifier) {
    const url = `https://www.linkedin.com/in/${currentUser.publicIdentifier}/`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url });
      }
    });
  }
}

// 跳过
async function handleSkip() {
  await incrementSkipped();
  goToNextUser();
}

// 收藏
async function handleLike() {
  const user = similarUsers[currentIndex];
  await addFavorite(user);
  await updateStats();
  
  // 先跳转到下一个用户
  goToNextUser();
  
  // 后台累加新的相似用户（去重），即使失败也不影响流程
  if (user && user.publicIdentifier) {
    loadSimilarUsers(user.publicIdentifier, true).catch(error => {
      console.log('后台累加失败，不影响流程:', error);
    });
  }
}

// 跳转到下一个用户
function goToNextUser() {
  const user = similarUsers[currentIndex];
  currentIndex++;
  
  if (currentIndex < similarUsers.length) {
    showCurrentUser();
    // 跳转到下一个用户的 LinkedIn 页面
    const nextUser = similarUsers[currentIndex];
    const url = `https://www.linkedin.com/in/${nextUser.publicIdentifier}/`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url });
      }
    });
  } else {
    // 所有用户已看完
    isSearching = false; // 筛选完成
    showError('🎉 所有推荐已看完！');
    elements.stats.style.display = 'none';
    elements.currentUser.style.display = 'none';
  }
}

// 停止筛选
async function handleStop() {
  // 清空推荐列表
  similarUsers = [];
  currentIndex = 0;
  isSearching = false; // 停止筛选状态
  
  // 检查当前页面状态，决定显示什么
  await checkCurrentPage();
}

// 更新统计信息
async function updateStats() {
  const stats = await getStats();
  elements.favoriteCount.textContent = stats.favoritesCount;
  
  if (similarUsers.length > 0) {
    elements.pendingCount.textContent = similarUsers.length - currentIndex;
  }
}

// 加载收藏列表
async function loadFavorites() {
  const favorites = await getFavorites();
  const session = await getSession();
  
  if (favorites.length === 0) {
    elements.favoritesList.innerHTML = '';
    elements.favoritesEmpty.style.display = 'block';
    // 同步收藏页操作按钮状态
    updateFavoritesActionsState(!!(session && session.access_token));
    return;
  }
  
  elements.favoritesEmpty.style.display = 'none';
  
  elements.favoritesList.innerHTML = favorites.map(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || '匿名用户';
    const avatarHtml = user.profilePictureURL 
      ? `<img src="${user.profilePictureURL}" alt="Avatar" class="avatar">`
      : `<div class="avatar"></div>`;
    
    return `
      <div class="favorite-item" data-identifier="${user.publicIdentifier}">
        ${avatarHtml}
        <div class="user-info">
          <h4>${fullName}</h4>
          <p>${user.headline || '暂无简介'}</p>
        </div>
        <div class="favorite-actions">
          <button class="btn-small btn-visit" data-url="https://www.linkedin.com/in/${user.publicIdentifier}/">
            访问
          </button>
          <button class="btn-small btn-remove" data-identifier="${user.publicIdentifier}">
            移除
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定事件
  document.querySelectorAll('.btn-visit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!session || !session.access_token) {
        alert('请先登录');
        return;
      }
      const url = e.target.dataset.url;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
        }
      });
    });
  });
  
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!session || !session.access_token) {
        alert('请先登录');
        return;
      }
      const identifier = e.target.dataset.identifier;
      await removeFavorite(identifier);
      await loadFavorites();
      await updateStats();
    });
  });

  // 同步收藏页操作按钮状态
  updateFavoritesActionsState(!!(session && session.access_token));
}

// 监听页面可见性变化（侧边栏关闭/隐藏）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 侧边栏被隐藏或关闭
    console.log('侧边栏已隐藏');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url?.includes('linkedin.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SIDEPANEL_CLOSED' }).catch(() => {
          // 忽略错误
        });
      }
    });
  }
});

// 监听页面卸载（侧边栏完全关闭）
window.addEventListener('beforeunload', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url?.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SIDEPANEL_CLOSED' }).catch(() => {
        // 忽略错误
      });
    }
  });
});

// 启动应用
init();
