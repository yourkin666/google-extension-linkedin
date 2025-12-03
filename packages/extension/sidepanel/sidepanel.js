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
  templatesTab: document.getElementById('templates-tab'),
  
  // Status
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  notProfile: document.getElementById('not-profile'),
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
  
  // Favorites
  favoritesList: document.getElementById('favorites-list'),
  favoritesEmpty: document.getElementById('favorites-empty'),
  
  // Templates
  templatesList: document.getElementById('templates-list'),
  templatesEmpty: document.getElementById('templates-empty'),
  btnAddTemplate: document.getElementById('btn-add-template'),
  templateModal: document.getElementById('template-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalClose: document.getElementById('modal-close'),
  btnCancelTemplate: document.getElementById('btn-cancel-template'),
  btnSaveTemplate: document.getElementById('btn-save-template'),
  templateName: document.getElementById('template-name'),
  templateSubject: document.getElementById('template-subject'),
  templateBody: document.getElementById('template-body'),
};

// 初始化
async function init() {
  setupEventListeners();
  await checkCurrentPage();
  await updateStats();
}

// 设置事件监听
function setupEventListeners() {
  // Tab 切换
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // 操作按钮
  elements.btnStartSearch.addEventListener('click', handleStartSearch);
  elements.btnSkip.addEventListener('click', handleSkip);
  elements.btnLike.addEventListener('click', handleLike);
  elements.btnStop.addEventListener('click', handleStop);
  
  // 监听 storage 变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentUsername) {
      // 只有在非筛选状态下才响应 URL 变化
      if (!isSearching) {
        checkCurrentPage();
      }
    }
  });
}

// 切换 Tab
async function switchTab(tabName) {
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  if (tabName === 'main') {
    elements.mainTab.classList.add('active');
    elements.favoritesTab.classList.remove('active');
    elements.templatesTab.classList.remove('active');
  } else if (tabName === 'favorites') {
    elements.mainTab.classList.remove('active');
    elements.favoritesTab.classList.add('active');
    elements.templatesTab.classList.remove('active');
    await loadFavorites();
  } else if (tabName === 'templates') {
    elements.mainTab.classList.remove('active');
    elements.favoritesTab.classList.remove('active');
    elements.templatesTab.classList.add('active');
    await loadTemplates();
  }
}

// 检查当前页面
async function checkCurrentPage() {
  const result = await chrome.storage.local.get('currentUsername');
  currentUsername = result.currentUsername;
  
  if (!currentUsername) {
    showNotProfile();
  } else {
    // 检测到用户主页，显示"找相似"按钮，等待用户点击
    showReadyToStart();
  }
}

// 显示"待开始"状态
function showReadyToStart() {
  hideAllStatus();
  elements.readyToStart.style.display = 'block';
  elements.stats.style.display = 'none';
  elements.currentUser.style.display = 'none';
}

// 开始搜索相似用户
async function handleStartSearch() {
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
  elements.readyToStart.style.display = 'none';
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
    showError('加载失败，请检查后端服务是否运行 🔧');
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
  
  if (favorites.length === 0) {
    elements.favoritesList.innerHTML = '';
    elements.favoritesEmpty.style.display = 'block';
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
      const identifier = e.target.dataset.identifier;
      await removeFavorite(identifier);
      await loadFavorites();
      await updateStats();
    });
  });
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

// ==================== 邮件模板管理 ====================

let currentEditingTemplateId = null;

// 获取默认模板
function getDefaultTemplates() {
  return [
    {
      id: 'default-1',
      name: '通用招聘',
      subject: 'Exciting opportunity at {company}',
      content: `Hi {name},

I hope this email finds you well. I came across your profile on LinkedIn and was impressed by your experience at {company}.

We have an exciting opportunity that I think would be a great fit for your background.

Would you be open to a quick chat?

Best regards`
    },
    {
      id: 'default-2',
      name: '技术职位',
      subject: 'Technical Role - {company}',
      content: `Hello {name},

I'm reaching out regarding a technical position at our company. Your background in {title} caught my attention.

Would you be interested in learning more?

Thanks!`
    }
  ];
}

// 加载邮件模板列表
async function loadTemplates() {
  const result = await chrome.storage.local.get(['emailTemplates']);
  let templates = result.emailTemplates;
  
  // 如果没有模板，使用默认模板
  if (!templates || templates.length === 0) {
    templates = getDefaultTemplates();
    await chrome.storage.local.set({ emailTemplates: templates });
  }
  
  if (templates.length === 0) {
    elements.templatesList.innerHTML = '';
    elements.templatesEmpty.style.display = 'block';
    return;
  }
  
  elements.templatesEmpty.style.display = 'none';
  
  elements.templatesList.innerHTML = templates.map(template => `
    <div class="template-card" data-id="${template.id}">
      <div class="template-card-header">
        <div class="template-card-name">${escapeHtml(template.name)}</div>
        <div class="template-card-actions">
          <button class="btn-small btn-visit" data-action="edit" data-id="${template.id}">
            编辑
          </button>
          <button class="btn-small btn-remove" data-action="delete" data-id="${template.id}">
            删除
          </button>
        </div>
      </div>
      <div class="template-card-subject">主题: ${escapeHtml(template.subject)}</div>
      <div class="template-card-preview">${escapeHtml(template.content)}</div>
    </div>
  `).join('');
  
  // 绑定按钮事件
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openEditModal(id);
    });
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('确定要删除这个模板吗？')) {
        await deleteTemplate(id);
      }
    });
  });
}

// 打开新建模板对话框
function openAddModal() {
  currentEditingTemplateId = null;
  elements.modalTitle.textContent = '新建模板';
  elements.templateName.value = '';
  elements.templateSubject.value = '';
  elements.templateBody.value = '';
  elements.templateModal.style.display = 'flex';
}

// 打开编辑模板对话框
async function openEditModal(templateId) {
  const result = await chrome.storage.local.get(['emailTemplates']);
  const templates = result.emailTemplates || [];
  const template = templates.find(t => t.id === templateId);
  
  if (!template) return;
  
  currentEditingTemplateId = templateId;
  elements.modalTitle.textContent = '编辑模板';
  elements.templateName.value = template.name;
  elements.templateSubject.value = template.subject;
  elements.templateBody.value = template.content;
  elements.templateModal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
  elements.templateModal.style.display = 'none';
  currentEditingTemplateId = null;
}

// 保存模板
async function saveTemplate() {
  const name = elements.templateName.value.trim();
  const subject = elements.templateSubject.value.trim();
  const content = elements.templateBody.value.trim();
  
  if (!name) {
    alert('请输入模板名称');
    return;
  }
  
  if (!subject) {
    alert('请输入邮件主题');
    return;
  }
  
  if (!content) {
    alert('请输入邮件内容');
    return;
  }
  
  const result = await chrome.storage.local.get(['emailTemplates']);
  let templates = result.emailTemplates || [];
  
  if (currentEditingTemplateId) {
    // 编辑现有模板
    const index = templates.findIndex(t => t.id === currentEditingTemplateId);
    if (index !== -1) {
      templates[index] = {
        ...templates[index],
        name,
        subject,
        content
      };
    }
  } else {
    // 新建模板
    const newTemplate = {
      id: `template-${Date.now()}`,
      name,
      subject,
      content
    };
    templates.push(newTemplate);
  }
  
  await chrome.storage.local.set({ emailTemplates: templates });
  closeModal();
  await loadTemplates();
}

// 删除模板
async function deleteTemplate(templateId) {
  const result = await chrome.storage.local.get(['emailTemplates']);
  let templates = result.emailTemplates || [];
  
  templates = templates.filter(t => t.id !== templateId);
  
  await chrome.storage.local.set({ emailTemplates: templates });
  await loadTemplates();
}

// HTML转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 绑定模板管理事件
function setupTemplateEventListeners() {
  // 新建模板
  elements.btnAddTemplate?.addEventListener('click', openAddModal);
  
  // 关闭模态框
  elements.modalClose?.addEventListener('click', closeModal);
  elements.btnCancelTemplate?.addEventListener('click', closeModal);
  
  // 保存模板
  elements.btnSaveTemplate?.addEventListener('click', saveTemplate);
  
  // 点击模态框背景关闭
  elements.templateModal?.addEventListener('click', (e) => {
    if (e.target === elements.templateModal) {
      closeModal();
    }
  });
}

// 启动应用
init();
setupTemplateEventListeners();

