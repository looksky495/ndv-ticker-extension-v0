class DmdataHttpClient {
  #accessToken;

  constructor (accessToken){
    this.#accessToken = accessToken;
    this.appName = "ndv-ticker-extension";
  }

  /**
   * DMDATA.JP API の WebSocket 接続を開始します。
   * @returns {import("./types/http/WebSocketStartResponse.mjs").Response} WebSocket の接続 URL
   */
  async socketStart (){
    const res = await fetch("https://api.dmdata.jp/v2/socket", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.#accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        classifications: [
          "eew.forecast",
          "telegram.earthquake"
        ],
        appName: this.appName,
        formatMode: "json"
      })
    });
    if (!res.ok){
      throw new Error(`socketStart request failed with status ${res.status}`);
    }
    return await res.json();
  }

  /**
   * DMDATA.JP API の WebSocket 接続を閉じます。
   * @param {Number} id 閉じる WebSocket ID
   * @returns
   */
  async socketClose (id){
    if (!(id instanceof Number)) return;
    const res = await fetch("https://api.dmdata.jp/v2/socket/" + id, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${this.#accessToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok){
      throw new Error(`socketClose request failed with status ${res.status}`);
    }
    return;
  }
}

export {
  DmdataHttpClient
};
