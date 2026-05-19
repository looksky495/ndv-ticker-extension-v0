/**
 * @typedef {Object} Success
 * @description WebSocket開始レスポンスの型定義
 * @property {String} responseId - API処理ID
 * @property {String} responseTime - API処理時刻
 * @property {"ok"} status - 処理結果ステータス
 * @property {String} ticket - WebSocketに接続するためのticket
 * @property {Object} websocket - WebSocketへの接続情報
 * @property {Number} websocket.id - WebSocketID
 * @property {String} websocket.url - WebSocketの接続先URLでticker付き
 * @property {String[]} websocket.protocol - WebSocketのProtocolで配列の要素は dmdata.v2 一つで固定
 * @property {Integer} websocket.expiration - キーの有効時間で単位は秒。値は 300 で固定
 * @property {String[]} websocket.classifications - WebSocketで受信する配信区分
 * @property {"no" | "including"} test - including のときのみ、XML電文のテストをWebSocketで受け取る
 * @property {String[] | null} types - WebSocketで受け取るデータ種類コードリスト。Null 時は受け取る配信区分の全部を受け取る
 * @property {String[]} formats - WebSocketで受け取るデータフォーマットリスト
 * @property {String | null} appName - アプリケーション名
*/

/**
 * @typedef {Success | import("./ErrorResponse.mjs").ErrorResponse} Response
 * @description WebSocket開始レスポンス全体の型定義
 */
