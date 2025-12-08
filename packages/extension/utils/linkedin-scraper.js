/**
 * LinkedIn 页面数据抓取工具
 * 从当前 LinkedIn 用户主页抓取工作经历和教育经历
 */

/**
 * 抓取用户基本信息
 */
function scrapeBasicInfo() {
  try {
    // 用户名
    const nameElement = document.querySelector('h1.text-heading-xlarge') || document.querySelector('main h1');
    const name = nameElement ? nameElement.textContent.trim() : '';
    
    // 职位
    const titleElement = document.querySelector('.text-body-medium.break-words') || document.querySelector('main h1 + * p, main h1 + * div');
    const title = titleElement ? titleElement.textContent.trim() : '';
    
    // 位置
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words') || document.querySelector('svg[aria-label*="位置"], svg[aria-label*="Location"]')?.parentElement?.querySelector('span,div');
    const location = locationElement ? locationElement.textContent.trim() : '';
    
    // 头像
    const avatarElement = document.querySelector('img.pv-top-card-profile-picture__image') || document.querySelector('img[alt*="头像"], img[alt*="profile" i]');
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
 * 抓取工作经历
 * 兼容两种LinkedIn显示格式：
 * 1. 一个公司多个职位：第一行显示公司，下面有多个职位子项
 * 2. 一个公司一个职位：第一行显示职位，第二行显示公司
 */
function scrapeExperience() {
  try {
    const experiences = [];
    
    // 定位 LinkedIn 的工作经历区域（兼容新版/旧版结构）
    let experienceSection = document.querySelector('#experience');
    if (!experienceSection) {
      // 通过标题文本匹配（多语言）
      const headingTexts = ['Experience', '工作经历', 'Experiencia', 'Experiência', 'Expérience', 'Erfahrung'];
      const allHeadings = Array.from(document.querySelectorAll('h2, h3, span, div'));
      const heading = allHeadings.find(el => {
        const txt = (el.textContent || '').trim();
        return headingTexts.some(t => txt === t || txt.startsWith(t + ' '));
      });
      if (heading) {
        experienceSection = heading.closest('section') || heading.parentElement;
      }
    }
    if (!experienceSection) {
      console.log('CoLink Debug: 未找到工作经历区域');
      return experiences;
    }
    
    // 找到工作经历列表
    let root = experienceSection.closest('section') || experienceSection;
    let experienceList = root.querySelectorAll('li.artdeco-list__item, li.pvs-list__item');
    
    // Fallback：有些布局中列表在 section 的后续兄弟节点
    if (!experienceList || experienceList.length === 0) {
      const lists = Array.from(document.querySelectorAll('ul.pvs-list'));
      const headingTexts = ['Experience', '工作经历', 'Experiencia', 'Experiência', 'Expérience', 'Erfahrung'];
      const candidate = lists.find(ul => {
        const sec = ul.closest('section');
        if (!sec) return false;
        const headingEl = sec.querySelector('h2, h3, span, div');
        const text = (headingEl?.textContent || '').trim();
        return headingTexts.some(t => text === t || text.startsWith(t + ' '));
      });
      if (candidate) {
        experienceList = candidate.querySelectorAll('li.artdeco-list__item, li.pvs-list__item');
      }
    }
    
    if (!experienceList || experienceList.length === 0) {
      console.log('CoLink Debug: 未找到工作经历列表项');
      
      // Redwood 布局兜底：查找基于 componentkey 的卡片项
      let redwoodItems = Array.from((root || document).querySelectorAll('[componentkey^="entity-collection-item"]'));
      // 只保留包含公司链接的项
      redwoodItems = redwoodItems.filter(el => el.querySelector('a[href*="/company/"]'));
      
      if (redwoodItems.length > 0) {
        console.log(`CoLink Debug: Redwood 结构，找到 ${redwoodItems.length} 个经历卡片`);
        redwoodItems.forEach((item, index) => {
          try {
            const companyLink = item.querySelector('a[href*="/company/"]');
            const companyUrl = companyLink ? companyLink.href : '';
            const logo = (item.querySelector('img') || {}).src || '';

            const ps = Array.from(item.querySelectorAll('p'));
            const title = (ps[0]?.textContent || '').trim();
            const companyText = (ps[1]?.textContent || '').trim();
            const company = companyText ? companyText.split('·')[0].trim() : '';
            const dates = (ps[2]?.textContent || '').trim();
            const location = (ps[3]?.textContent || '').trim();

            if (title || company) {
              experiences.push({ title, company, dates, location, logo, companyUrl });
              console.log(`  Redwood ✓ 第 ${index + 1} 项添加: ${title} @ ${company}`);
            }
          } catch (err) {
            console.log('  Redwood 解析失败，跳过一项:', err);
          }
        });
        return experiences;
      }

      // 兜底：在全页范围内查找含公司链接的 li
      const allItems = Array.from(document.querySelectorAll('li'));
      const filtered = allItems.filter(li => li.querySelector('a[href*="/company/"]'));
      if (filtered.length === 0) return experiences;
      experienceList = filtered;
    }
    
    console.log(`CoLink Debug: 找到 ${experienceList.length} 个工作经历项`);
    
    experienceList.forEach((item, index) => {
      try {
        console.log(`\n=== CoLink Debug: 解析第 ${index + 1} 个工作经历 ===`);
        
        // 检查是否有子列表（表示一个公司多个职位）
        const subList = item.querySelector('ul.pvs-list, ul.artdeco-list');
        
        if (subList) {
          console.log('CoLink Debug: 检测到多职位格式（有子列表）');
          
          // 情况1: 一个公司多个职位
          // 第一行是公司名称
          const companyElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"]');
          const company = companyElement ? companyElement.textContent.trim() : '';
          console.log('  公司:', company);
          
          // 公司logo
          const logoElement = item.querySelector('img');
          const logo = logoElement ? logoElement.src : '';
          console.log('  Logo:', logo ? '✓' : '✗');
          
          // 公司链接
          const companyLinkElement = item.querySelector('a[href*="/company/"]');
          const companyUrl = companyLinkElement ? companyLinkElement.href : '';
          console.log('  公司链接:', companyUrl ? '✓' : '✗');
          
          // 获取所有子职位
          const subItems = subList.querySelectorAll('li.artdeco-list__item, li.pvs-list__item');
          console.log(`  找到 ${subItems.length} 个子职位`);
          
          if (subItems.length > 0) {
            // 选择第一个职位（最近的职位）
            const firstSubItem = subItems[0];
            
            // 职位名称
            const titleElement = firstSubItem.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"]');
            const title = titleElement ? titleElement.textContent.trim() : '';
            console.log('  职位:', title);
            
            // 时间段
            const dateElement = firstSubItem.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"], .t-14 span[aria-hidden="true"]');
            const dates = dateElement ? dateElement.textContent.trim() : '';
            console.log('  时间:', dates);
            
            // 地点
            let locationElement = firstSubItem.querySelector('.t-14.t-normal.t-black--light:not(:has(time))');
            if (!locationElement) {
              // 新版可能用另一套 class
              const spans = Array.from(firstSubItem.querySelectorAll('.t-14 span[aria-hidden="true"]'));
              locationElement = spans.find(sp => /\p{L}/u.test((sp.textContent || '').trim())) || null;
            }
            const location = locationElement ? locationElement.textContent.trim() : '';
            console.log('  地点:', location);
            
            if (title || company) {
              experiences.push({
                title,
                company,
                dates,
                location,
                logo,
                companyUrl
              });
              console.log('  ✓ 成功添加');
            } else {
              console.log('  ✗ 跳过（无职位或公司名）');
            }
          }
        } else {
          console.log('CoLink Debug: 检测到单职位格式（无子列表）');
          
          // 情况2: 一个公司一个职位
          // LinkedIn结构：职位(粗体) -> 公司 · 工作类型 -> 时间段 -> 地点
          
          // 第一行是职位名称（粗体）
          const titleElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"]');
          const title = titleElement ? titleElement.textContent.trim() : '';
          console.log('  职位:', title);
          
          // 获取所有普通文本的span（按顺序）
          const allSpans = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"], .t-14 span[aria-hidden="true"]');
          console.log(`  找到 ${allSpans.length} 个信息span`);
          
          // 第一个span通常是：公司名称 · 工作类型
          // 需要提取公司名称（去掉 · 及后面的内容）
          let company = '';
          let dates = '';
          
          if (allSpans.length > 0) {
            const companyText = allSpans[0].textContent.trim();
            // 分割 "公司名 · 工作类型"，只保留公司名
            company = companyText.split('·')[0].trim();
            console.log('  公司:', company);
            console.log('  原始公司文本:', companyText);
          }
          
          // 第二个span通常是时间段（包含日期或"个月"/"年"）
          if (allSpans.length > 1) {
            dates = allSpans[1].textContent.trim();
            console.log('  时间:', dates);
          }
          
          // 地点信息在另一个位置
          // 方法：找到包含地点的span（通常不在.t-black--light中，或者是最后一个独立的文本）
          let location = '';
          if (allSpans.length > 2) {
            // 尝试获取第三个span（可能是地点）
            location = allSpans[2].textContent.trim();
            // 如果第三个span和dates一样（重复），尝试其他方式
            if (location === dates) {
              location = '';
            }
            console.log('  地点:', location);
          }
          
          // 公司logo
          const logoElement = item.querySelector('img');
          const logo = logoElement ? logoElement.src : '';
          console.log('  Logo:', logo ? '✓' : '✗');
          
          // 公司链接
          const companyLinkElement = item.querySelector('a[href*="/company/"]');
          const companyUrl = companyLinkElement ? companyLinkElement.href : '';
          console.log('  公司链接:', companyUrl ? '✓' : '✗');
          
          if (title || company) {
            experiences.push({
              title,
              company,
              dates,
              location,
              logo,
              companyUrl
            });
            console.log('  ✓ 成功添加');
          } else {
            console.log('  ✗ 跳过（无职位或公司名）');
          }
        }
        
        // 打印元素的HTML结构供调试
        console.log('  HTML结构:', item.innerHTML.substring(0, 200) + '...');
        
      } catch (error) {
        console.error(`CoLink Debug: 解析第 ${index + 1} 个工作经历失败:`, error);
      }
    });
    
    console.log(`\nCoLink Debug: 最终提取到 ${experiences.length} 个工作经历`);
    console.log('CoLink Debug: 提取结果:', experiences);
    
    return experiences;
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
