/**
 * 浮动面板逻辑
 * 处理拖动、最小化、数据显示等功能
 */

// 防止重复声明
if (typeof FloatingPanel === 'undefined') {
  
class FloatingPanel {
  constructor() {
    this.panel = null;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;
    
    this.userData = null;
    this.templates = [];
    
    this.isSidePanelOpen = false;
    
    this.init();
  }
  
  init() {
    this.panel = document.getElementById('colink-floating-panel');
    if (!this.panel) return;
    
    // 绑定事件
    this.bindDragEvents();
    this.bindButtonEvents();
    this.listenToSidePanelStatus();
    
    // 加载数据
    this.loadUserData();
    this.loadTemplates();
    
    // 设置初始位置（右侧）
    this.setInitialPosition();
  }
  
  /**
   * 拖动功能
   */
  bindDragEvents() {
    const header = document.getElementById('panel-header');
    if (!header) return;
    
    // 使用 pointer 事件，模仿浮动按钮的拖拽体验
    header.addEventListener('pointerdown', (e) => this.dragStart(e));
    window.addEventListener('pointermove', (e) => this.drag(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
  }
  
  dragStart(e) {
    // 仅左键或触摸
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // 如果点击的是按钮，不触发拖动（预留）
    if (e.target.closest('.btn-minimize') || e.target.closest('.btn-close')) return;

    // 初始化拖动状态
    this.isDragging = true;
    this.moved = false;
    this.panel.classList.add('dragging');

    // 当前矩形，用于切换到 left/top 布局
    const rect = this.panel.getBoundingClientRect();
    // 记录指针相对面板左上角的偏移
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    // 切换为通过 left/top 控制位置
    this.panel.style.left = rect.left + 'px';
    this.panel.style.top = rect.top + 'px';
    this.panel.style.right = 'auto';
    this.panel.style.transform = 'none';

    // 存储当前位置
    this.xOffset = rect.left;
    this.yOffset = rect.top;
  }
  
  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const dx = e.clientX - (this.xOffset + this.offsetX);
    const dy = e.clientY - (this.yOffset + this.offsetY);
    if (!this.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      this.moved = true;
    }

    // 面板当前尺寸
    const rect = this.panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 新位置（限制在可视区域内）
    let newLeft = e.clientX - this.offsetX;
    let newTop = e.clientY - this.offsetY;
    const maxLeft = vw - rect.width;
    const maxTop = vh - rect.height;
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));

    this.xOffset = newLeft;
    this.yOffset = newTop;
    this.setTranslate(newLeft, newTop);
  }
  
  dragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.panel.classList.remove('dragging');
    // 可按需抑制误触点击（头部目前无点击动作，暂不处理 justDragged）
  }
  
  setTranslate(xPos, yPos) {
    // 模仿浮动按钮：使用 left/top 定位，不使用 transform 平移
    this.panel.style.transform = 'none';
    this.panel.style.left = xPos + 'px';
    this.panel.style.top = yPos + 'px';
    this.panel.style.right = 'auto';
  }
  
  
  /**
   * 监听侧边栏状态
   */
  listenToSidePanelStatus() {
    // 监听来自 background 的侧边栏状态消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'COLINK_SIDEPANEL_STATUS') {
        const isOpen = event.data.isOpen;
        this.handleSidePanelChange(isOpen);
      }
      
      // 监听URL变化消息
      if (event.data.type === 'COLINK_URL_CHANGED') {
        console.log('CoLink: 检测到URL变化，重新加载用户数据');
        this.handleUrlChange(event.data.url, event.data.username);
      }
    });
  }
  
  /**
   * 处理侧边栏状态变化
   */
  handleSidePanelChange(isOpen) {
    if (this.isSidePanelOpen === isOpen) return;
    
    this.isSidePanelOpen = isOpen;
    
    // 添加过渡动画
    this.panel.style.transition = 'transform 0.3s ease-out';
    
    if (isOpen) {
      // 侧边栏打开，强制移到左侧
      console.log('CoLink: 侧边栏打开，移动到左侧');
      this.setDefaultLeftPosition();
    } else {
      // 侧边栏关闭，强制移回右侧
      console.log('CoLink: 侧边栏关闭，移回右侧');
      this.setDefaultRightPosition();
    }
    
    // 动画完成后移除transition
    setTimeout(() => {
      this.panel.style.transition = '';
    }, 300);
  }
  
  /**
   * 处理URL变化（用户切换到不同的个人资料页面）
   */
  handleUrlChange(url, username) {
    console.log('CoLink: 处理URL变化', url, username);
    
    // 清空当前数据
    this.userData = null;
    
    // 重置模板选择
    const templateSelect = document.getElementById('template-select');
    if (templateSelect) {
      templateSelect.value = '';
    }
    const templatePreview = document.getElementById('template-preview');
    if (templatePreview) {
      templatePreview.style.display = 'none';
    }
    
    // 重新加载数据
    this.loadUserData();
  }
  
  setInitialPosition() {
    // 始终从右侧开始
    this.setDefaultRightPosition();
  }
  
  setDefaultRightPosition() {
    // 默认右侧位置（上移一点）
    const rightMargin = 20;
    const centered = (window.innerHeight - this.panel.offsetHeight) / 2;
    const shiftUp = 160; // 上移像素（更多）
    const topMargin = Math.max(10, centered - shiftUp);

    this.xOffset = window.innerWidth - this.panel.offsetWidth - rightMargin;
    this.yOffset = topMargin;
    this.setTranslate(this.xOffset, this.yOffset);
  }
  
  setDefaultLeftPosition() {
    // 紧贴侧边栏左侧（侧边栏一般宽度约 400px），并上移一点
    const sidePanelWidth = 400; // Chrome 侧边栏默认宽度
    const gap = 10; // 与侧边栏的间距
    const centered = (window.innerHeight - this.panel.offsetHeight) / 2;
    const shiftUp = 160; // 上移像素（更多）
    const topMargin = Math.max(10, centered - shiftUp);
    
    // 计算位置：从右边开始，减去侧边栏宽度，再减去浮动窗口宽度和间距
    this.xOffset = window.innerWidth - sidePanelWidth - this.panel.offsetWidth - gap;
    this.yOffset = topMargin;
    this.setTranslate(this.xOffset, this.yOffset);
  }
  
  /**
   * 按钮事件
   */
  bindButtonEvents() {
    // 最小化按钮已删除
    // const btnMinimize = document.getElementById('btn-minimize');
    // if (btnMinimize) {
    //   btnMinimize.addEventListener('click', () => this.minimize());
    // }
    
    // 关闭按钮已删除
    // const btnClose = document.getElementById('btn-close');
    // if (btnClose) {
    //   btnClose.addEventListener('click', () => this.close());
    // }
    
    // 最小化标签已删除
    // const minimizedTab = document.getElementById('minimized-tab');
    // if (minimizedTab) {
    //   minimizedTab.addEventListener('click', () => this.restore());
    // }
    
    // 点击邮箱框框
    const emailBox = document.getElementById('user-email');
    if (emailBox) {
      emailBox.addEventListener('click', () => this.showEmailFeatureInDevelopment());
    }
    
    // 模板选择
    const templateSelect = document.getElementById('template-select');
    if (templateSelect) {
      // 移除之前的 change 事件自动发送
      // templateSelect.addEventListener('change', (e) => this.onTemplateChange(e));
    }
    
    // 发送按钮点击
    const btnSendEmail = document.getElementById('btn-send-email');
    if (btnSendEmail) {
      btnSendEmail.addEventListener('click', () => {
        const templateId = templateSelect ? templateSelect.value : '';
        if (!templateId) {
          this.showToast('请先选择邮件模板', 'warning');
          return;
        }
        this.sendEmail(templateId);
      });
    }
    
    // 管理模板
    const manageTemplates = document.getElementById('manage-templates');
    if (manageTemplates) {
      manageTemplates.addEventListener('click', (e) => {
        e.preventDefault();
        this.openTemplateManager();
      });
    }
  }
  
  minimize() {
    this.panel.classList.add('minimized');
    const minimizedTab = document.getElementById('minimized-tab');
    if (minimizedTab) {
      minimizedTab.style.display = 'block';
    }
  }
  
  restore() {
    this.panel.classList.remove('minimized');
    const minimizedTab = document.getElementById('minimized-tab');
    if (minimizedTab) {
      minimizedTab.style.display = 'none';
    }
  }
  
  close() {
    this.panel.classList.add('hidden');
    // 通知 content script 面板已关闭
    window.postMessage({ type: 'COLINK_PANEL_CLOSED' }, '*');
  }
  
  show() {
    this.panel.classList.remove('hidden');
    this.panel.classList.remove('minimized');
    const minimizedTab = document.getElementById('minimized-tab');
    if (minimizedTab) {
      minimizedTab.style.display = 'none';
    }
  }
  
  /**
   * 加载用户数据（优化版：更快速 + 骨架屏）
   */
  async loadUserData() {
    try {
      const panelContent = document.getElementById('panel-content');
      const loadingState = document.getElementById('loading-state');
      
      // 显示骨架屏
      this.showSkeletonScreen();
      loadingState.style.display = 'none';
      panelContent.style.display = 'flex';
      panelContent.style.opacity = '1';
      
      // 更激进的等待策略：尝试立即抓取，失败则等待
      let userData = null;
      const startTime = Date.now();
      
      // 先尝试立即抓取（不等待）
      if (window.scrapeUserProfile) {
        userData = window.scrapeUserProfile();
        // 检查是否获取到有效数据
        if (!userData.name || !userData.name.trim()) {
          userData = null;
        }
      }
      
      // 如果没有获取到数据，再等待页面加载
      if (!userData) {
        await this.waitForPageLoad();
        userData = window.scrapeUserProfile ? window.scrapeUserProfile() : {};
      }

      // 工作经历可能异步渲染，若为空，短暂重试一次（或等待节点出现）
      if (!userData?.experience || userData.experience.length === 0) {
        await this.waitForExperienceSection();
        const retry = window.scrapeUserProfile ? window.scrapeUserProfile() : userData;
        if (retry?.experience && retry.experience.length > 0) {
          userData = retry;
        }
      }
      
      const loadTime = Date.now() - startTime;
      console.log(`CoLink: 数据加载耗时 ${loadTime}ms`);
      
      this.userData = userData;
      this.userData.email = '暂无邮箱';
      
      // 使用 requestAnimationFrame 优化渲染
      requestAnimationFrame(() => {
        this.renderUserData();
        this.hideSkeletonScreen();
      });
      
    } catch (error) {
      console.error('加载用户数据失败:', error);
      const panelContent = document.getElementById('panel-content');
      panelContent.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ef4444;">
          加载失败，请刷新重试
        </div>
      `;
    }
  }
  
  waitForPageLoad() {
    return new Promise((resolve) => {
      let timeoutId = null;
      let checkIntervalId = null;
      
      // LinkedIn 是 SPA，需要等待内容真正加载
      const checkContent = () => {
        // 检查关键元素是否已加载（兼容新旧版）
        const nameElement = document.querySelector('h1.text-heading-xlarge') // 旧版
          || document.querySelector('h1.inline.t-24') // 旧版
          || document.querySelector('h2[class*="_770d8f2b"]') // 新版Redwood
          || document.querySelector('main h1')
          || document.querySelector('main h2');
        if (nameElement && nameElement.textContent.trim()) {
          // 找到内容了，清除超时定时器
          if (timeoutId) clearTimeout(timeoutId);
          if (checkIntervalId) clearTimeout(checkIntervalId);
          // 立即返回，不再额外等待
          resolve();
        } else {
          // 没找到，继续等待
          checkIntervalId = setTimeout(checkContent, 50); // 从100ms减少到50ms
        }
      };
      
      // 开始检查（最多等待3秒）
      timeoutId = setTimeout(() => {
        console.warn('CoLink: 等待页面加载超时');
        if (checkIntervalId) clearTimeout(checkIntervalId);
        resolve();
      }, 3000); // 从5秒减少到3秒
      
      checkContent();
    });
  }

  /**
   * 等待工作经历区域/卡片渲染（最多 2 秒）
   */
  waitForExperienceSection() {
    return new Promise((resolve) => {
      const maxWait = 2000;
      const start = Date.now();

      const check = () => {
        const hasLegacy = document.querySelector('div#experience');
        const hasModernRoot = document.querySelector('div[componentkey*="Experience" i]')
          || Array.from(document.querySelectorAll('div[componentkey]')).some(el => (el.getAttribute('componentkey')||'').toLowerCase().includes('experience'));
        const hasItems = document.querySelector('div[componentkey^="entity-collection-item"]');
        if (hasLegacy || hasModernRoot || hasItems) return resolve();
        if (Date.now() - start >= maxWait) return resolve();
        setTimeout(check, 150);
      };
      check();
    });
  }
  
  /**
   * 显示骨架屏
   */
  showSkeletonScreen() {
    // 邮箱骨架
    const emailBox = document.getElementById('user-email');
    if (emailBox) {
      emailBox.classList.add('skeleton');
    }
    
    // 工作经历骨架
    const experienceList = document.getElementById('experience-list');
    if (experienceList) {
      experienceList.textContent = '';
      experienceList.appendChild(this.getSkeletonItems(2));
      experienceList.classList.add('skeleton-loading');
    }
    
    // 教育经历骨架
    const educationList = document.getElementById('education-list');
    if (educationList) {
      educationList.textContent = '';
      educationList.appendChild(this.getSkeletonItems(1));
      educationList.classList.add('skeleton-loading');
    }
  }
  
  /**
   * 隐藏骨架屏
   */
  hideSkeletonScreen() {
    const emailBox = document.getElementById('user-email');
    if (emailBox) {
      emailBox.classList.remove('skeleton');
    }
    
    const experienceList = document.getElementById('experience-list');
    if (experienceList) {
      experienceList.classList.remove('skeleton-loading');
    }
    
    const educationList = document.getElementById('education-list');
    if (educationList) {
      educationList.classList.remove('skeleton-loading');
    }
  }
  
  /**
   * 生成骨架屏项目
   */
  getSkeletonItems(count) {
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'timeline-item skeleton-item';
      
      const logo = document.createElement('div');
      logo.className = 'timeline-logo skeleton skeleton-circle';
      item.appendChild(logo);
      
      const content = document.createElement('div');
      content.className = 'timeline-content';
      
      const title = document.createElement('div');
      title.className = 'timeline-title skeleton skeleton-text';
      title.style.width = '70%';
      content.appendChild(title);
      
      const subtitle = document.createElement('div');
      subtitle.className = 'timeline-subtitle skeleton skeleton-text';
      subtitle.style.width = '85%';
      content.appendChild(subtitle);
      
      const date = document.createElement('div');
      date.className = 'timeline-date skeleton skeleton-text';
      date.style.width = '50%';
      content.appendChild(date);
      
      item.appendChild(content);
      fragment.appendChild(item);
    }
    
    return fragment;
  }
  
  async fetchEmail() {
    // TODO: 替换为真实API
    // 模拟API延迟（优化：从500ms减少到100ms）
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 返回模拟邮箱
    const name = this.userData?.name || 'user';
    const mockEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    return mockEmail;
  }
  
  renderUserData() {
    if (!this.userData) return;
    
    // 邮箱模块已改为固定显示"查找邮箱"，不需要渲染
    
    // 工作经历
    this.renderExperience();
    
    // 教育经历
    this.renderEducation();
  }
  
  renderExperience() {
    const list = document.getElementById('experience-list');
    const empty = document.getElementById('experience-empty');
    
    if (!this.userData.experience || this.userData.experience.length === 0) {
      if (list) list.textContent = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    if (empty) empty.style.display = 'none';
    
    if (list) {
      // 清空现有内容
      list.textContent = '';
      
      // 使用 DOM API 创建元素，避免 innerHTML sanitization 问题
      this.userData.experience.forEach((exp, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item clickable-timeline-item';
        item.setAttribute('data-company', exp.company);
        item.setAttribute('data-index', index.toString());
        
        // 创建 logo
        if (exp.logo) {
          const img = document.createElement('img');
          img.src = exp.logo;
          img.alt = exp.company;
          img.className = 'timeline-logo';
          item.appendChild(img);
        } else {
          const logoPlaceholder = document.createElement('div');
          logoPlaceholder.className = 'timeline-logo placeholder';
          logoPlaceholder.textContent = 'W';
          item.appendChild(logoPlaceholder);
        }
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'timeline-content';
        
        const title = document.createElement('div');
        title.className = 'timeline-title';
        title.textContent = exp.title;
        content.appendChild(title);
        
        const subtitle = document.createElement('div');
        subtitle.className = 'timeline-subtitle';
        subtitle.textContent = exp.company;
        content.appendChild(subtitle);
        
        const date = document.createElement('div');
        date.className = 'timeline-date';
        date.textContent = exp.dates;
        content.appendChild(date);
        
        item.appendChild(content);
        
        // 创建箭头
        const arrow = document.createElement('span');
        arrow.className = 'timeline-arrow';
        arrow.textContent = '→';
        item.appendChild(arrow);
        
        // 添加点击事件
        item.addEventListener('click', () => {
          const company = item.getAttribute('data-company');
          if (company) {
            this.openCompanyGoogle(company);
          }
        });
        
        list.appendChild(item);
      });
    }
  }
  
  /**
   * 在新标签页中打开公司的 Google 搜索结果
   */
  openCompanyGoogle(companyName) {
    const searchQuery = encodeURIComponent(companyName);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    window.open(googleSearchUrl, '_blank');
  }
  
  renderEducation() {
    const list = document.getElementById('education-list');
    const empty = document.getElementById('education-empty');
    
    if (!this.userData.education || this.userData.education.length === 0) {
      if (list) list.textContent = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    if (empty) empty.style.display = 'none';
    
    if (list) {
      // 清空现有内容
      list.textContent = '';
      
      // 使用 DOM API 创建元素，避免 innerHTML sanitization 问题
      this.userData.education.forEach((edu, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item clickable-timeline-item';
        item.setAttribute('data-school', edu.school);
        item.setAttribute('data-index', index.toString());
        
        // 创建 logo
        if (edu.logo) {
          const img = document.createElement('img');
          img.src = edu.logo;
          img.alt = edu.school;
          img.className = 'timeline-logo';
          item.appendChild(img);
        } else {
          const logoPlaceholder = document.createElement('div');
          logoPlaceholder.className = 'timeline-logo placeholder';
          logoPlaceholder.textContent = 'E';
          item.appendChild(logoPlaceholder);
        }
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'timeline-content';
        
        const title = document.createElement('div');
        title.className = 'timeline-title';
        title.textContent = edu.school;
        content.appendChild(title);
        
        const subtitle = document.createElement('div');
        subtitle.className = 'timeline-subtitle';
        subtitle.textContent = edu.degree;
        content.appendChild(subtitle);
        
        const date = document.createElement('div');
        date.className = 'timeline-date';
        date.textContent = edu.dates;
        content.appendChild(date);
        
        item.appendChild(content);
        
        // 创建箭头
        const arrow = document.createElement('span');
        arrow.className = 'timeline-arrow';
        arrow.textContent = '→';
        item.appendChild(arrow);
        
        // 添加点击事件
        item.addEventListener('click', () => {
          const school = item.getAttribute('data-school');
          if (school) {
            this.openSchoolGoogle(school);
          }
        });
        
        list.appendChild(item);
      });
    }
  }
  
  /**
   * 在新标签页中打开学校的 Google 搜索结果
   */
  openSchoolGoogle(schoolName) {
    const searchQuery = encodeURIComponent(schoolName);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    window.open(googleSearchUrl, '_blank');
  }
  
  /**
   * 邮件模板
   */
  async loadTemplates() {
    try {
      let templates = null;

      // 优先使用 chrome.storage（仅在扩展环境可用，页面上下文不可用）
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['emailTemplates']);
        templates = result.emailTemplates || null;
      }

      // 兜底使用 window.localStorage（页面上下文可用）
      if (!templates && typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = window.localStorage.getItem('colink_emailTemplates');
          if (raw) {
            templates = JSON.parse(raw);
          }
        } catch (_) {
          // 忽略解析失败
        }
      }

      this.templates = templates || this.getDefaultTemplates();
      this.renderTemplates();
    } catch (error) {
      console.error('加载模板失败:', error);
      this.templates = this.getDefaultTemplates();
      this.renderTemplates();
    }
  }
  
  getDefaultTemplates() {
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
  
  renderTemplates() {
    const select = document.getElementById('template-select');
    if (!select) return;

    // 清空再渲染，避免 innerHTML 触发宿主页面的 HTML sanitize 日志
    select.textContent = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- 选择邮件模板 --';
    select.appendChild(placeholder);

    this.templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
  }
  
  // onTemplateChange 不再需要
  
  renderTemplate(template) {
    if (!this.userData) return template;
    
    return template
      .replace(/\{name\}/g, this.userData.name || '')
      .replace(/\{title\}/g, this.userData.title || '')
      .replace(/\{company\}/g, this.extractCompany() || '')
      .replace(/\{location\}/g, this.userData.location || '');
  }
  
  extractCompany() {
    if (!this.userData.experience || this.userData.experience.length === 0) {
      return '';
    }
    return this.userData.experience[0].company;
  }
  
  /**
   * 显示邮箱功能开发中提示
   */
  showEmailFeatureInDevelopment() {
    this.showToast('该功能开发中', 'info');
  }
  
  /**
   * 发送邮件
   */
  sendEmail(templateId) {
    // 暂时不实现发送功能
    this.showToast('发送邮件功能开发中...', 'info');
    console.log('选中的模板ID:', templateId);
    
    /* 
    const emailInput = document.getElementById('user-email');
    const email = emailInput ? emailInput.value : '';
    
    if (!email || email === '暂无邮箱' || email === '加载中...') {
      this.showToast('未找到有效邮箱地址', 'error');
      return;
    }
    
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    
    // 替换变量
    const renderedSubject = this.renderTemplate(template.subject);
    const renderedContent = this.renderTemplate(template.content);
    
    // 构建 mailto 链接
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedContent)}`;
    
    // 打开默认邮件客户端
    window.location.href = mailtoLink;
    
    this.showToast('已打开邮件客户端', 'success');
    */
  }
  
  /**
   * 打开模板管理器
   */
  openTemplateManager() {
    console.log('CoLink: 正在打开模板管理器...');
    
    // 浮动面板运行在页面上下文中，不能直接使用 chrome.runtime.sendMessage
    // 需要通过 postMessage 发送给 content script
    window.postMessage({ 
      type: 'COLINK_OPEN_SIDEPANEL',
      tab: 'templates'
    }, '*');
  }
  
  /**
   * 工具函数
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showToast(message, type = 'success') {
    // 根据类型选择颜色
    let bgColor = '#10b981'; // success - green
    if (type === 'warning') {
      bgColor = '#f59e0b'; // warning - orange
    } else if (type === 'error') {
      bgColor = '#ef4444'; // error - red
    } else if (type === 'info') {
      bgColor = '#3b82f6'; // info - blue
    }
    
    // 创建 toast
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999999;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化（防止重复初始化）
if (!window.colinkFloatingPanel) {
  let panelInstance = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      panelInstance = new FloatingPanel();
    });
  } else {
    panelInstance = new FloatingPanel();
  }

  // 导出实例供外部使用
  window.colinkFloatingPanel = panelInstance;
}

} // 结束 FloatingPanel 类定义的 if 块
