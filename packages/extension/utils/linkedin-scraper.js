/**
 * LinkedIn 页面数据抓取工具
 * 从当前 LinkedIn 用户主页抓取工作经历和教育经历
 */

/**
 * 抓取用户基本信息
 */
function scrapeBasicInfo() {
  try {
    // 用户名（兼容新旧版）
    const nameElement = document.querySelector('h1.text-heading-xlarge') // 旧版大标题
      || document.querySelector('h1.inline.t-24') // 旧版行内标题
      || document.querySelector('h1[class*="aULtpaWoUDgsIiUDkPhlwLCRuaeg"]') // 旧版特定类名
      || document.querySelector('h2[class*="_770d8f2b"]') // 新版Redwood h2标签
      || document.querySelector('main h1')
      || document.querySelector('main h2');
    const name = nameElement ? nameElement.textContent.trim() : '';
    
    // 职位（兼容新旧版）
    const titleElement = document.querySelector('.text-body-medium.break-words') // 旧版
      || document.querySelector('div.text-body-medium') // 旧版变体
      || document.querySelector('p[class*="_770d8f2b"][class*="fcc55da4"]') // 新版Redwood
      || document.querySelector('main h1 + * p, main h1 + * div')
      || document.querySelector('main h2 + * p');
    const title = titleElement ? titleElement.textContent.trim() : '';
    
    // 位置（兼容新旧版）
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words') // 旧版
      || document.querySelector('span.text-body-small.inline.t-black--light') // 旧版变体
      || document.querySelector('p[class*="_770d8f2b"][class*="cd2b844a"][class*="bb1558bb"]') // 新版Redwood
      || document.querySelector('svg[aria-label*="位置"], svg[aria-label*="Location"]')?.parentElement?.querySelector('span,div');
    const location = locationElement ? locationElement.textContent.trim() : '';
    
    // 头像（兼容新旧版）
    const avatarElement = document.querySelector('img.pv-top-card-profile-picture__image') // 旧版
      || document.querySelector('img.pv-top-card-profile-picture__image--show') // 旧版变体
      || document.querySelector('[data-view-name*="profile-top-card-member-photo"] img') // 新版Redwood
      || document.querySelector('img[alt*="头像"], img[alt*="profile" i]');
    const avatar = avatarElement ? avatarElement.src : '';
    
    return {
      name,
      title,
      location,
      avatar
    };
  } catch (error) {
    console.error('抓取基本信息失败:', error);
    return {
      name: '',
      title: '',
      location: '',
      avatar: ''
    };
  }
}

/**
 * 抓取工作经历（双轨制实现）
 * - 方案A（老版/桌面端）：存在 div#experience
 *   - 根：div#experience
 *   - 行：li.artdeco-list__item（或 li.pvs-list__item 兜底）
 *   - 字段：
 *     - 职位：.t-bold 内的 span
 *     - 公司：.t-normal 内的 span（若包含“ · ”取左侧公司名）
 *     - 时间：.t-black--light
 * - 方案B（新版/移动端）：无 #experience，但存在 div[componentkey*="Experience"]
 *   - 根：div[componentkey*="Experience"]（大小写不敏感，提供 JS 兜底匹配）
 *   - 行：div[componentkey^="entity-collection-item"]
 *   - 字段来自 <a> 内第1/2/3个 <p>：依次为 职位/公司/时间
 */
function scrapeExperience() {
  try {
    const results = [];
    const headingTexts = ['Experience', '工作经历', 'Experiencia', 'Experiência', 'Expérience', 'Erfahrung'];

    // 提取“可见文本”：优先取 [aria-hidden="true"]，否则移除 .visually-hidden 后再取 textContent
    const pickText = (el) => {
      if (!el) return '';
      const prefers = el.querySelectorAll('[aria-hidden="true"]');
      if (prefers.length > 0) {
        const t = Array.from(prefers)
          .map(n => (n.textContent || '').trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (t) return t;
      }
      const clone = el.cloneNode(true);
      try { clone.querySelectorAll('.visually-hidden').forEach(n => n.remove()); } catch (_) {}
      return (clone.textContent || '').trim();
    };
    const safeSplitCompany = (text) => (text || '').split('·')[0].trim();

    const pushIfValid = (payload) => {
      const title = (payload.title || '').trim();
      const company = (payload.company || '').trim();
      if (title || company) results.push(payload);
    };

    // A轨：老版存在 #experience
    const legacyRoot = document.querySelector('div#experience');
    if (legacyRoot) {
      console.log('CoLink Debug: 使用方案A（#experience）');
      let items = legacyRoot.querySelectorAll('li.artdeco-list__item, li.pvs-list__item');

      // 若直接未命中，基于标题的 section 兜底
      if (!items || items.length === 0) {
        const candidateLists = Array.from(document.querySelectorAll('ul, ol'));
        const candidate = candidateLists.find((ul) => {
          const sec = ul.closest('section, div');
          if (!sec) return false;
          const headingEl = sec.querySelector('h2, h3, [class*="header" i], [class*="title" i]');
          const text = pickText(headingEl);
          return headingTexts.some((t) => text === t || text.startsWith(t + ' '));
        });
        if (candidate) items = candidate.querySelectorAll('li');
      }

      // 再兜底：该区域内所有 li 且包含公司链接
      if (!items || items.length === 0) {
        const scope = legacyRoot.closest('section') || legacyRoot.parentElement || document;
        const fallbackLis = Array.from(scope.querySelectorAll('li'))
          .filter((li) => li.querySelector && li.querySelector('a[href*="/company/"]'));
        items = fallbackLis;
      }

      console.log(`CoLink Debug: A轨 列表项数量=${items.length}`);
      items.forEach((item) => {
        try {
          const subList = item.querySelector('ul, ol');
          const titleEl = item.querySelector('.t-bold span[aria-hidden="true"], .t-bold span, .t-bold');
          const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal span, .t-14.t-normal');
          // 日期优先取 caption 包装器，再取黑色淡色文本
          const dateEl = item.querySelector('.pvs-entity__caption-wrapper, .t-black--light, .t-14.t-normal.t-black--light');
          const logoEl = item.querySelector('img');
          const companyLinkEl = item.querySelector('a[href*="/company/"]');

          let title = pickText(titleEl);
          let companyText = pickText(companyEl);
          let company = safeSplitCompany(companyText);
          let dates = pickText(dateEl);
          const logo = logoEl ? logoEl.src : '';
          const companyUrl = companyLinkEl ? companyLinkEl.href : '';

          // 若存在子列表，取第一个子职位填充字段
          if (subList) {
            const firstSub = subList.querySelector('li');
            const subTitleEl = firstSub?.querySelector('.t-bold span[aria-hidden="true"], .t-bold span, .t-bold');
            const subDateEl = firstSub?.querySelector('.pvs-entity__caption-wrapper, .t-black--light, .t-14.t-normal.t-black--light');
            if (!title) title = pickText(subTitleEl);
            if (!dates) dates = pickText(subDateEl);

            
          }

          pushIfValid({ title, company, dates, logo, companyUrl });
        } catch (_) {}
      });

      // 仅当 A 轨解析到数据时返回，否则继续尝试 B 轨
      if (results.length > 0) return results;
      console.log('CoLink Debug: A轨未解析到数据，继续尝试B轨');
    }

    // B轨：新版存在 componentkey*="Experience" 的容器
    let modernRoot = document.querySelector('div[componentkey*="Experience" i]');
    if (!modernRoot) {
      // 兜底：手动大小写不敏感匹配
      const all = Array.from(document.querySelectorAll('div[componentkey]'));
      modernRoot = all.find(el => {
        const val = (el.getAttribute('componentkey') || '').toLowerCase();
        return val.includes('experience');
      }) || null;
    }

    if (modernRoot) {
      console.log('CoLink Debug: 使用方案B（componentkey*="Experience"）');
      let items = modernRoot.querySelectorAll('div[componentkey^="entity-collection-item"]');

      // 若未命中，放宽匹配：该根下所有含公司链接的卡片节点
      if (!items || items.length === 0) {
        const candidates = Array.from(modernRoot.querySelectorAll('[componentkey], div, li'))
          .filter((el) => el.querySelector && el.querySelector('a[href*="/company/"]'));
        items = candidates;
      }

      // 仍为空，再全局兜底：所有 entity-collection-item
      if (!items || items.length === 0) {
        items = document.querySelectorAll('div[componentkey^="entity-collection-item"]');
      }

      console.log(`CoLink Debug: B轨 列表项数量=${items.length}`);
      items.forEach((item, idx) => {
        try {
          // 选择包含文本 <p> 的链接（跳过仅有 logo 的第一个链接）
          const anchors = Array.from(item.querySelectorAll('a[href]'));
          let link = anchors.find(a => a.querySelector('p')) || anchors[1] || anchors[0] || item;
          const ps = Array.from(link.querySelectorAll('p'));

          let title = pickText(ps[0]);
          let companyText = pickText(ps[1]);
          let company = safeSplitCompany(companyText);
          let dates = pickText(ps[2]);
          const logo = (item.querySelector('img') || {}).src || '';
          const companyUrl = (anchors.find(a => /\/company\//.test(a.getAttribute('href') || '')) || {}).href || '';

          // 进一步兜底：若 p[2] 不是日期，尝试查找含年份或连接符的 p
          if (!dates) {
            const dateLike = ps.find((p) => /\d{4}|年|月|\-|–/.test(pickText(p)));
            dates = pickText(dateLike);
          }

          // 若 p 未能命中，再从整项里兜底抓取
          if (!title) {
            title = pickText(item.querySelector('.t-bold span[aria-hidden="true"], .t-bold span, .t-bold')) || title;
          }
          if (!company) {
            companyText = pickText(item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal span, .t-14.t-normal')) || companyText;
            company = safeSplitCompany(companyText);
          }
          if (!dates) {
            dates = pickText(item.querySelector('.pvs-entity__caption-wrapper, .t-black--light, .t-14.t-normal.t-black--light')) || dates;
          }
          pushIfValid({ title, company, dates, logo, companyUrl });
        } catch (_) {}
      });
      return results;
    }

    // 未识别到根节点，进行全局兜底：
    console.warn('CoLink Debug: 未识别到工作经历根节点（A/B），尝试全局兜底');

    // 兜底1：全局 entity-collection-item
    let anyItems = document.querySelectorAll('div[componentkey^="entity-collection-item"]');
    if (anyItems && anyItems.length > 0) {
      console.log(`CoLink Debug: 兜底 entity-collection-item 数量=${anyItems.length}`);
      anyItems.forEach((item) => {
        try {
          const link = item.querySelector('a[href]') || item;
          const ps = Array.from(link.querySelectorAll('p'));
          let title = pickText(ps[0]);
          const companyText = pickText(ps[1]);
          const company = safeSplitCompany(companyText);
          let dates = pickText(ps[2]);
          if (!dates) {
            const dateLike = ps.find((p) => /\d{4}|年|月|\-|–/.test(pickText(p)));
            dates = pickText(dateLike);
          }
          const logo = (item.querySelector('img') || {}).src || '';
          const companyUrl = (item.querySelector('a[href*="/company/"]') || {}).href || '';
          pushIfValid({ title, company, dates, logo, companyUrl });
        } catch (_) {}
      });
      return results;
    }

    // 兜底2：全局 li 含公司链接
    const liAll = Array.from(document.querySelectorAll('li')).filter((li) => li.querySelector('a[href*="/company/"]'));
    if (liAll.length > 0) {
      console.log(`CoLink Debug: 兜底 li[a*="/company/"] 数量=${liAll.length}`);
      liAll.forEach((item) => {
        try {
          const titleEl = item.querySelector('.t-bold span[aria-hidden="true"], .t-bold span, .t-bold');
          const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal span, .t-14.t-normal');
          const dateEl = item.querySelector('.t-black--light, .t-14.t-normal.t-black--light');
          const logoEl = item.querySelector('img');
          const companyLinkEl = item.querySelector('a[href*="/company/"]');

          const title = pickText(titleEl) || pickText(item.querySelector('p'));
          const company = safeSplitCompany(pickText(companyEl) || pickText(item.querySelectorAll('p')[1]));
          const dates = pickText(dateEl) || pickText(item.querySelectorAll('p')[2]);
          const logo = logoEl ? logoEl.src : '';
          const companyUrl = companyLinkEl ? companyLinkEl.href : '';
          pushIfValid({ title, company, dates, logo, companyUrl });
        } catch (_) {}
      });
      return results;
    }

    console.warn('CoLink Debug: 全部兜底失败，返回空数组');
    return results;
  } catch (error) {
    console.error('CoLink Debug: 抓取工作经历失败:', error);
    return [];
  }
}

/**
 * 抓取教育经历
 */
function scrapeEducation() {
  try {
    const educations = [];
    
    // LinkedIn 的教育经历区域
    let educationSection = document.querySelector('#education');
    if (!educationSection) {
      const headingTexts = ['Education', '教育经历', 'Educación', 'Educação', 'Éducation', 'Ausbildung'];
      const allHeadings = Array.from(document.querySelectorAll('h2, h3, span, div'));
      const heading = allHeadings.find(el => {
        const txt = (el.textContent || '').trim();
        return headingTexts.some(t => txt === t || txt.startsWith(t + ' '));
      });
      if (heading) {
        educationSection = heading.closest('section') || heading.parentElement;
      }
    }
    if (!educationSection) {
      return educations;
    }
    
    // 找到教育经历列表
    const root = educationSection.closest('section') || educationSection;
    let educationList = root.querySelectorAll('li.artdeco-list__item, li.pvs-list__item');
    
    if (!educationList || educationList.length === 0) {
      // Redwood 布局兜底：查找含学校链接的卡片，componentkey 值可能是随机 GUID
      let redwoodItems = Array.from((root || document).querySelectorAll('[componentkey]'))
        .filter(el => el.querySelector('a[href*="/school/"]'));

      if (redwoodItems.length > 0) {
        redwoodItems.forEach((item) => {
          try {
            const logo = (item.querySelector('img') || {}).src || '';
            const schoolLink = item.querySelector('a[href*="/school/"]');

            // 优先在链接内部找顺序化的 p：p0 学校，p1 学位/专业
            let school = '';
            let degree = '';
            if (schoolLink) {
              const psInLink = Array.from(schoolLink.querySelectorAll('p'));
              if (psInLink.length > 0) school = (psInLink[0].textContent || '').trim();
              if (psInLink.length > 1) degree = (psInLink[1].textContent || '').trim();
            }

            // 若未获取到，再从整个卡片中回退：第一个 p 视作学校，第二个 p 视作学位
            if (!school || !degree) {
              const ps = Array.from(item.querySelectorAll('p'));
              if (!school && ps.length > 0) school = (ps[0].textContent || '').trim();
              if (!degree && ps.length > 1) degree = (ps[1].textContent || '').trim();
            }

            // 查找日期：匹配包含年份/连字符/“年”“月”的 p
            let dates = '';
            const allPs = Array.from(item.querySelectorAll('p'));
            const dateEl = allPs.find(p => /\d{4}|年|月|\-|–/.test((p.textContent || '')));
            if (dateEl) {
              const text = (dateEl.textContent || '').trim();
              // 排除明显的“成绩”行
              if (!/^成绩\s*:/.test(text)) {
                dates = text;
              }
            }

            if (school || degree) {
              educations.push({ school, degree, dates, logo });
            }
          } catch (_) {}
        });
        return educations;
      }
      return educations;
    }
    
    educationList.forEach(item => {
      try {
        // 学校名称
        const schoolElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"]');
        const school = schoolElement ? schoolElement.textContent.trim() : '';
        
        // 学位和专业
        const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14 span[aria-hidden="true"]');
        const degree = degreeElement ? degreeElement.textContent.trim() : '';
        
        // 时间段
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"], .t-14 span[aria-hidden="true"]');
        const dates = dateElement ? dateElement.textContent.trim() : '';
        
        // 学校logo
        const logoElement = item.querySelector('img');
        const logo = logoElement ? logoElement.src : '';
        
        if (school || degree) {
          educations.push({
            school,
            degree,
            dates,
            logo
          });
        }
      } catch (error) {
        console.error('解析单条教育经历失败:', error);
      }
    });
    
    return educations;
  } catch (error) {
    console.error('抓取教育经历失败:', error);
    return [];
  }
}

/**
 * 抓取所有用户信息
 */
function scrapeUserProfile() {
  const basicInfo = scrapeBasicInfo();
  const experience = scrapeExperience();
  const education = scrapeEducation();
  
  return {
    ...basicInfo,
    experience,
    education,
    scrapedAt: new Date().toISOString()
  };
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scrapeBasicInfo,
    scrapeExperience,
    scrapeEducation,
    scrapeUserProfile
  };
}
