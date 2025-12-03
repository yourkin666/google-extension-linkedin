// 本地存储工具
// 非模块化版本 - 全局函数

/**
 * 获取所有收藏的用户
 */
async function getFavorites() {
  const result = await chrome.storage.local.get('favorites');
  return result.favorites || [];
}

/**
 * 添加到收藏
 */
async function addFavorite(user) {
  const favorites = await getFavorites();
  
  // 检查是否已存在
  const exists = favorites.some(fav => fav.publicIdentifier === user.publicIdentifier);
  if (exists) {
    return favorites;
  }
  
  // 添加时间戳
  const newFavorite = {
    ...user,
    savedAt: new Date().toISOString()
  };
  
  favorites.unshift(newFavorite);
  await chrome.storage.local.set({ favorites });
  
  return favorites;
}

/**
 * 从收藏中移除
 */
async function removeFavorite(publicIdentifier) {
  const favorites = await getFavorites();
  const updated = favorites.filter(fav => fav.publicIdentifier !== publicIdentifier);
  await chrome.storage.local.set({ favorites: updated });
  return updated;
}

/**
 * 获取统计数据
 */
async function getStats() {
  const result = await chrome.storage.local.get(['favorites', 'skippedCount']);
  return {
    favoritesCount: (result.favorites || []).length,
    skippedCount: result.skippedCount || 0
  };
}

/**
 * 增加跳过计数
 */
async function incrementSkipped() {
  const result = await chrome.storage.local.get('skippedCount');
  const count = (result.skippedCount || 0) + 1;
  await chrome.storage.local.set({ skippedCount: count });
  return count;
}

