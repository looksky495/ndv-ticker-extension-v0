const endpoint = {
  authorization: "https://manager.dmdata.jp/account/oauth2/v1/auth",
  token: "https://manager.dmdata.jp/account/oauth2/v1/token",
  revocation: "https://manager.dmdata.jp/account/oauth2/v1/revoke"
};

const ClientID = "CId.vEdP_6-W16xgg7WTRzOFC4iO-2ECeXkBWgFraIn8NhaM";
const SCOPES = [
  "contract.list",
  "eew.get.forecast",
  "eew.get.warning",
  "parameter.earthquake",
  "parameter.tsunami",
  "socket.close",
  "socket.start",
  "telegram.data",
  "telegram.get.earthquake",
  "telegram.list"
];

const caches = {
  accessToken: null,
  accessTokenExp: 0,
  refreshToken: null
};

/**
 * OAuth2 Code Verifier を生成します。
 * @returns {string} Code Verifier
 */
const generateCodeVerifier = () => {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64Encode(array);
};

/**
 * PKCE Code Challenge を計算します。
 * @param {String} codeVerifier Code Verifier
 * @returns {Promise<String>} Code Challenge
 */
const calculatePKCECodeChallenge = async codeVerifier => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Encode(digest);
};

/**
 * ランダムな state 値を生成します。
 * @returns {string} ランダムな state 値
 */
const generateRandomState = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64Encode(array);
};

const base64Encode = arrayBuffer => {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// 有効期限（6時間）と 安全マージン（秒）
const ACCESS_TOKEN_LIFETIME_MS = 6 * 60 * 60 * 1000;
const EXP_SKEW_MS = 60 * 1000; // 60秒前に期限切れ扱い

const setRefreshToken = async (token) => {
  caches.refreshToken = token;
  await chrome.storage.local.set({ dmdataRefreshToken: token });
}

/***
 * 保存されたリフレッシュトークンを取得します。
 * @returns {Promise<string|null>} リフレッシュトークン、または null（存在しない場合）
 */
const getRefreshToken = async () => {
  if (caches.refreshToken) return caches.refreshToken;
  const result = await chrome.storage.local.get("dmdataRefreshToken");
  if (result.dmdataRefreshToken) {
    caches.refreshToken = result.dmdataRefreshToken;
    return caches.refreshToken;
  }
  return null;
};

/**
 * アクセストークンを確実に取得します。
 * 1) 未取得 or 期限切れ → refresh()
 * 2) そうでなければキャッシュ返却
 * @returns {Promise<string>} 有効なアクセストークン
 */
const getAccessToken = async () => {
  const now = Date.now();
  if (!caches.accessToken || (caches.accessTokenExp - now) <= EXP_SKEW_MS) {
    const { accessToken } = await refresh();
    return accessToken;
  }
  return caches.accessToken;
};

/**
 * DMdata OAuth2 認証を開始します。
 * @returns {Promise<{accessToken: string, scope: string}>} アクセストークンとスコープ
 */
const authenticate = async () => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const state = generateRandomState();
  const redirectUrl = chrome.identity.getRedirectURL();

  const authUrl = new URL(endpoint.authorization);
  authUrl.searchParams.set("client_id", ClientID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUrl);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const returnedUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl + "",
    interactive: true
  });
  const url = new URL(returnedUrl);
  if (url.searchParams.get("state") !== state) {
    throw new Error(`Invalid state "${url.searchParams.get("state")}" provided.`);
  }

  const tokenData = await fetch(endpoint.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: ClientID,
      grant_type: "authorization_code",
      code: url.searchParams.get("code"),
      redirect_uri: redirectUrl,
      code_verifier: codeVerifier
    })
  }).then(response => {
    if (!response.ok) {
      throw new Error(`Token request failed with status ${response.status}`);
    }
    return response.json();
  });

  if (tokenData.error){
    throw new Error(`Token request error: ${tokenData.error} - ${tokenData.error_description}`);
  }

  // アクセストークンのキャッシュと有効期限の設定
  caches.refreshToken = tokenData.refresh_token;
  caches.accessToken = tokenData.access_token;
  caches.accessTokenExp = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
  setRefreshToken(tokenData.refresh_token);

  return {
    accessToken: tokenData.access_token,
    scope: tokenData.scope
  };
};

/**
 * アクセストークンの更新を行います。
 * @returns {Promise<{accessToken: string, scope: string}>} 新しいアクセストークンとスコープ
 */
const refresh = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available to revoke.");
  }

  const res = await fetch(endpoint.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: ClientID,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!res.ok){
    throw new Error(`Token refresh request failed with status ${res.status}`);
  }

  const tokenData = await res.json();
  if (tokenData.error){
    throw new Error(`Token refresh request error: ${tokenData.error} - ${tokenData.error_description}`);
  }

  if (tokenData.refresh_token) await setRefreshToken(tokenData.refresh_token);

  // アクセストークンのキャッシュと有効期限の設定
  caches.accessToken = tokenData.access_token;
  caches.accessTokenExp = Date.now() + ACCESS_TOKEN_LIFETIME_MS;

  return {
    accessToken: tokenData.access_token,
    scope: tokenData.scope
  };
};

/**
 * アクセストークンの無効化を行います。
 */
const revoke = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available to revoke.");
  }

  const res = await fetch(endpoint.revocation, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: ClientID,
      token: refreshToken
    })
  });
  if (!res.ok){
    throw new Error(`Token revocation request failed with status ${res.status}`);
  }

  // キャッシュと保存されたリフレッシュトークンを削除
  caches.accessToken = null;
  caches.accessTokenExp = 0;
  caches.refreshToken = null;
  await chrome.storage.local.remove("dmdataRefreshToken");
};

export {
  getAccessToken,
  authenticate,
  refresh,
  revoke,
};
