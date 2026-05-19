class DmdataWebSocketClient {
  #id;
  #socket
  #events;

  /**
   * DmdataWebSocketClient コンストラクタ
   * @param {String} websocketUrl WebSocket 接続 URL
   * @param {Number} id WebSocket ID
   */
  constructor (websocketUrl, id){
    this.url = websocketUrl;
    this.#id = id;
    this.#socket = null;
    this.#events = {};
  }

  /**
   * API レスポンスからインスタンスを生成します。
   * @param {import("./types/http/WebSocketStartResponse.mjs").Success | import("./types/http/ErrorResponse.mjs").ErrorResponse} response - API レスポンス
   * @returns {DmdataWebSocketClient | import("./types/http/WebSocketStartResponse.mjs").Error} WebSocket クライアントのインスタンス、エラー時はレスポンスをそのまま返す
   */
  static fromApiResponse (response){
    response
    if (response.status === "error") return response;
    return new DmdataWebSocketClient(response.websocket.url, response.websocket.id);
  }

  /**
   * WebSocket 接続を開始します。
   */
  connect (){
    this.#socket = new WebSocket(this.url);
  }

  /**
   * WebSocket 接続を終了します。
   * @returns {Number} WebSocket ID
   */
  disconnect (){
    if (this.#socket){
      this.#socket.close();
      this.#socket = null;
      return this.#id;
    }
    return null;
  }

  [Symbol.dispose] (){
    this.disconnect();
  }
}

export { DmdataWebSocketClient };
