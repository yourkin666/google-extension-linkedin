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
    const nameElement = document.querySelector('h1.text-heading-xlarge');
    const name = nameElement ? nameElement.textContent.trim() : '';
    
    // 职位
    const titleElement = document.querySelector('.text-body-medium.break-words');
    const title = titleElement ? titleElement.textContent.trim() : '';
    
    // 位置
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
    const location = locationElement ? locationElement.textContent.trim() : '';
    
    // 头像
    const avatarElement = document.querySelector('img.pv-top-card-profile-picture__image');
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
 */
function scrapeExperience() {
  try {
    const experiences = [];
    
    // LinkedIn 的工作经历区域
    const experienceSection = document.querySelector('#experience');
    if (!experienceSection) {
      return experiences;
    }
    
    // 找到工作经历列表
    const experienceList = experienceSection.closest('section')?.querySelectorAll('li.artdeco-list__item');
    
    if (!experienceList || experienceList.length === 0) {
      return experiences;
    }
    
    experienceList.forEach(item => {
      try {
        // 职位名称
        const titleElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"]');
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // 公司名称
        const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const company = companyElement ? companyElement.textContent.trim() : '';
        
        // 时间段
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const dates = dateElement ? dateElement.textContent.trim() : '';
        
        // 地点
        const locationElement = item.querySelector('.t-14.t-normal.t-black--light:not(:has(time))');
        const location = locationElement ? locationElement.textContent.trim() : '';
        
        // 公司logo
        const logoElement = item.querySelector('img');
        const logo = logoElement ? logoElement.src : '';
        
        if (title || company) {
          experiences.push({
            title,
            company,
            dates,
            location,
            logo
          });
        }
      } catch (error) {
        console.error('解析单条工作经历失败:', error);
      }
    });
    
    return experiences;
  } catch (error) {
    console.error('抓取工作经历失败:', error);
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
    const educationSection = document.querySelector('#education');
    if (!educationSection) {
      return educations;
    }
    
    // 找到教育经历列表
    const educationList = educationSection.closest('section')?.querySelectorAll('li.artdeco-list__item');
    
    if (!educationList || educationList.length === 0) {
      return educations;
    }
    
    educationList.forEach(item => {
      try {
        // 学校名称
        const schoolElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const school = schoolElement ? schoolElement.textContent.trim() : '';
        
        // 学位和专业
        const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const degree = degreeElement ? degreeElement.textContent.trim() : '';
        
        // 时间段
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
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

