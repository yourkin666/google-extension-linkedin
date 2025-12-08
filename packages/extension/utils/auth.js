// Supabase OAuth（Google）- Chrome 扩展版（MV3）
// 通过 chrome.identity.launchWebAuthFlow 实现 PKCE 流程
// 非模块化版本：导出全局函数供 sidepanel 等 UI 调用

// 需要的配置：
// - CONFIG.supabase.url
// - CONFIG.supabase.anonKey
// - 扩展 ID 的回调： https://<EXT_ID>.chromiumapp.org/

(function () {
  const SUPABASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.supabase && CONFIG.supabase.url) ? CONFIG.supabase.url : '';
  const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' && CONFIG.supabase && CONFIG.supabase.anonKey) ? CONFIG.supabase.anonKey : '';
  const EXT_ID = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id)
    ? chrome.runtime.id
    : 'fcimokplgiejpafehfmfcpkdjpibnnkj'; // 回退到开发环境 ID（本地调试）
  const REDIRECT_URI = `https://${EXT_ID}.chromiumapp.org/`;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase 配置缺失，请确认 utils/config.generated.js 中存在 supabase.url 与 supabase.anonKey');
  }

  // 存储键名
  const STORAGE_KEY = 'supabaseSession';

  // 工具：Base64URL 编码
  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // 工具：生成 code_verifier 与 code_challenge
  async function createPkcePair() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = base64UrlEncode(array);
    const enc = new TextEncoder();
    const data = enc.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = base64UrlEncode(digest);
    return { codeVerifier, codeChallenge };
  }

  // 解析 URL 上的查询/哈希参数
  function parseParamsFromUrl(url) {
    const u = new URL(url);
    const params = new URLSearchParams(u.search);
    // 同时兼容 hash 参数
    if (u.hash && u.hash.startsWith('#')) {
      const hashParams = new URLSearchParams(u.hash.slice(1));
      hashParams.forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    }
    return params;
  }

  // 保存/读取会话
  async function saveSession(session) {
    await chrome.storage.local.set({ [STORAGE_KEY]: session });
  }

  async function loadSession() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return data[STORAGE_KEY] || null;
  }

  async function clearSession() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }

  // 刷新 access_token（如需要）
  async function refreshTokenIfNeeded() {
    const session = await loadSession();
    if (!session) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    // 提前 30 秒刷新
    if (session.expires_at && session.expires_at > nowSec + 30) {
      return session;
    }

    if (!session.refresh_token) {
      return session;
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (!res.ok) {
      console.warn('刷新 token 失败，清理本地会话');
      await clearSession();
      return null;
    }

    const data = await res.json();
    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      token_type: data.token_type || 'bearer',
      user: data.user || session.user || null,
    };
    await saveSession(newSession);
    return newSession;
  }

  // 公开：获取可用 access token（自动刷新）
  async function getAccessToken() {
    let session = await loadSession();
    if (!session) return null;
    session = await refreshTokenIfNeeded();
    return session ? session.access_token : null;
  }

  // 公开：获取完整 session
  async function getSession() {
    return await loadSession();
  }

  // 公开：Google 登录
  async function loginWithGoogle() {
    const { codeVerifier, codeChallenge } = await createPkcePair();

    const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set('provider', 'google');
    authorizeUrl.searchParams.set('redirect_to', REDIRECT_URI);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('scope', 'openid email profile');

    console.log('🔐 开始登录流程');
    console.log('📍 回调 URI:', REDIRECT_URI);
    console.log('🔗 授权 URL:', authorizeUrl.toString());

    // 打开授权窗口
    let redirectUrl;
    try {
      redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authorizeUrl.toString(),
        interactive: true,
      });
      console.log('✅ 授权窗口返回:', redirectUrl);
    } catch (err) {
      console.error('❌ 授权窗口错误:', err);
      throw new Error(`授权窗口打开失败: ${err.message}`);
    }

    const params = parseParamsFromUrl(redirectUrl);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    if (error) {
      console.error('❌ OAuth 错误:', error, errorDescription);
      throw new Error(`登录失败: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
    }
    const code = params.get('code');
    if (!code) {
      console.error('❌ 未获取到授权码，URL:', redirectUrl);
      throw new Error('登录失败：未获取到授权码');
    }
    console.log('✅ 获取到授权码');

    // 交换 token（PKCE）
    console.log('🔄 开始交换 token...');
    console.log('📦 交换参数:', {
      code: code ? `${code.substring(0, 20)}...` : '(空)',
      code_verifier: codeVerifier ? `${codeVerifier.substring(0, 20)}...` : '(空)',
      redirect_uri: REDIRECT_URI
    });
    
    const tokenPayload = {
      auth_code: code,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI
    };
    console.log('📤 发送的 payload:', tokenPayload);
    
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(tokenPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ Token 交换失败:', res.status, text);
      throw new Error(`交换会话失败: ${res.status} ${text}`);
    }

    const data = await res.json();
    console.log('✅ Token 交换成功，用户:', data.user?.email);
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      token_type: data.token_type || 'bearer',
      user: data.user || null,
    };
    await saveSession(session);
    console.log('💾 会话已保存');
    return session;
  }

  // 公开：登出
  async function logout() {
    const session = await loadSession();
    if (session && session.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      } catch (e) {
        // 忽略网络错误
      }
    }
    await clearSession();
  }

  // 导出到全局
  window.getAccessToken = getAccessToken;
  window.getSession = getSession;
  window.loginWithGoogle = loginWithGoogle;
  window.logout = logout;
})();
