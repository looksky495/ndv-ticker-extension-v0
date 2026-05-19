# Natural Disaster Viewer (NDV) Chrome拡張 仕様概要

最終更新: 2025-08-09
バージョン: β0.5.5（manifest 0.5.5 / AppVersionCode: beta29）

## 概要
NDV は、自然災害に関する各種公式/公共データを取得し、横長ティッカー（1080x128）と時計（128x128）で表示・音声報知する Chrome 拡張です。緊急地震速報（EEW）、地震情報、津波情報、気象警報・注意報、降水・気温・風・河川・ライブ番組表などを統合してリアルタイムに表示します。

- 実装形態: Chrome Extension Manifest V3（service_worker: `scripts/background.js`）
- メインUI: `popup2.html`（ポップアップウィンドウ 1248x640）+ Canvas 描画（`init-canvas.js`）
- コアロジック: `scripts/main.js`（約4,800行）
- データ・入出力補助: `init-dataOperator.js`, `init-fontOperator.js`, `init-speechController.js` ほか
- 配布紹介ページ: `/private/NDV-offical-site/ext/index.html`

## 主な機能
- 通常ティッカー表示（任意5項目をスクロール表示）
- 緊急地震速報（予報/警報/取消）表示・アラーム音
- 地震情報（震源・規模・震度）
- 津波情報（VTSE41 予報、VTSE51 観測）日本語/英語テキスト生成、警報レベル推定
- 気象情報（気温/降水/風/湿度/日照/積雪/気圧 等のランキング/実況）
- 気象警報・注意報、避難情報
- 河川情報（水位/危険度）
- ウェザーニュース ソラボタン・番組表の表示
- ニュース速報（手動入力）
- 音声読み上げ（EEW/地震情報/土砂災害/特別警報/短時間大雨）
- 音楽再生（簡易BGM）
- トラフィックモニター（取得タイムスタンプ可視化）
- 全画面化/データ保存（自動/手動）/各種詳細設定

## UI 構成（`popup2.html`）
- Canvas 本体: `#sample1` 1080x128、時計: `#sample2` 128x128
- 上部コントロール: スクロール速度、データ保存（自動/保存）
- タブ:
  - 通常（表示項目編集、コマンド機能リンク）
  - 緊急地震速報（テスト受信、アラーム停止）
  - 地震情報（テンプレート表示/切替）
  - ニュース速報（手動入力/待機キュー一覧）
  - ソラボタン・アンケート（表示/開閉、トグル）
  - 音楽再生（ファイル選択/リスト）
  - Traffic Monitor（各データ取得の最終時刻表示）
  - 読み上げ（有効種別、音量、ステータス）
  - 詳細設定（テーマ/音量/スケジュール等）

CSS: `css/stylesheet.css`

## コマンド機能（通常本文のプレースホルダ）
通常表示の「本文」に `<...>` 形式でコマンドを記述すると、対応データに展開されます。一覧: `disp-commands.html`

例）
- `<weather/temperature/high>` 最高気温ランキング
- `<weather/temperature/low>` 最低気温ランキング
- `<weather/rain/1h>` / `<weather/rain/24h>` 降水量
- `<weather/wind_rank>` 風速ランキング / `<weather/wind>` 実況風
- `<weather/temperature/current>` 実況気温
- `<weather/snow/*>` 降雪/積雪
- `<weather/pressure>` 気圧
- `<weather/warn>` 警報・注意報
- `<weather/river>` 河川
- `<bousai/evacuation>` 避難情報
- `<weathernews/live/timetable>` WNI ライブ番組表

## データソースとポーリング間隔（既定値）
URL 定義: `scripts/config.js`、権限: manifest `host_permissions`
既定間隔は `scripts/background.js` の `chrome.storage.sync.settings.interval` に保存（ms）。

- EEW: `api.iedred7584.com`（既定 5000ms）/ `lmoni.bosai.go.jp` / Yahoo! 強震モニタ（時間指定JSON）
- NHK 地震情報: `www.nhk.or.jp/weather-data/v1/...`（12000ms）
- JMA XML フィード: `developer/xml/feed/extra.xml`（15000ms）
- tenki.jp 津波ページ（観測補足）: `earthquake.tenki.jp/bousai/tsunami/`（30000ms）
- WNI Mスケール: `weathernews.jp/mscale/json/scale.json`（30000ms）
- WNI ソラボタン: `.../solive_sorabtn.json`（30000ms）
- WNI 河川: `river/csv_v2/latest.csv`（300000ms）
- WNI ライブ番組表: `.../solive_timetable/timetable.json`（240000ms）
- 東京電力 停電情報 XML: `teideninfo.tepco.co.jp/...`（60000ms）
- JMA 震度・津波・アメダス・地域定義など: `www.jma.go.jp/bosai/...` 一式

備考: 津波は `init-dataOperator.js` の DataOperator.tsunami が `list.json` を監視し、同一 EventID の VTSE41/VTSE51 を読み込み、テキスト・警報レベル・Expire を組み立てます。

## 権限・コマンド（manifest）
- manifest_version: 3
- permissions: background, fontSettings, storage, tabs, identity
- host_permissions: 上記データソース（JMA/NHK/WNI/LMONI/GPV/自前GAS 等）
- commands: `main_window_open`（mac: Cmd+Shift+E / win: Alt+Shift+V）
- background: `scripts/background.js`（service_worker）
- web_accessible_resources: `sound/*.mp3`, `img/*.png`, `data/*`, `css/*.css|*.woff2`, `scripts/*.js|*.wasm`, `library/*.js`
- sandbox: `sandbox/webassembly.html`（EEW WASM 実験用）

## ストレージ仕様（初期値）
`chrome.storage.sync` に保存。初期化: `scripts/background.js`

- `mode0`（通常表示）
  - `main`: 本文コマンド/固定文（5項目）
  - `title`: 各項目のタイトル（5項目）
- `mode3`: ニュース速報 初期記事
- `settings`
  - `autorecord`（自動保存ON/OFF）
  - `fixitem[5]`（固定スクロール）
  - `soraview`（ソラボタン強制表示）
  - `details`
    - `earthquake`: intensity/magnitude/depth の閾値
    - `eew`: intensity/unknown/magnitude/depth の閾値
  - `clipboard`: { eew, quake }（クリップボード送出）
  - `interval`: 取得間隔（ms）各種（上記）
  - `volume`: { eewL, eewH, eewP, gl, ntc, spW, tnm, hvra, fldoc }
  - `theme`: { color: 0|1|2 }（配色モード: light/dark/mono）
  - `sendEEW`: EEW送信（将来機能）
- `app`: { lastVer: "", newUser: true }

## 音声読み上げ（`init-speechController.js`）
- Web Audio API による簡易 TTS：プリレンダ音声 WAV/MP3 をプログラム再生
- キュー制御: `start()` に `direct/path/id/wait` を混在して投入
- 種別: EEW、地震（震源/規模/深さ/最大震度/分布）、土砂災害警戒情報、特別警報、記録的短時間大雨
- 音源パス構造: `sound/common/*`, `sound/eew/*`, `sound/quake/*`, `sound/ground/*`, `sound/warning/*`, `VPOA50_issued.wav`
- UI から全体音量・有効種別切替、現在状態の表示

## 描画・フォント・テーマ
- Canvas 描画初期化: `init-canvas.js`
- テーマ配色: `scripts/config.js` の `colorScheme`（light/dark/mono）
- フォント登録: `init-fontOperator.js`
  - Inter（OFL 1.1）、Noto Sans JP（OFL 1.1）、JPA フォント（IPA Font License）、7barSP

## ディレクトリ構成（抜粋）
- `scripts/` … 背景・設定・データ・描画・音声・WASM など
- `library/` … jquery ほかユーティリティ
- `css/`、`font/`、`img/`、`sound/`、`data/` … アセット
- `sandbox/` … WebAssembly 実験（EEW）
- `popup2.html` … メインUI
- `disp-commands.html` … コマンド一覧
- `updateNotice.html` … 更新通知ビュー

## インストール/起動（ローカル）
1) Chrome 拡張ページ（chrome://extensions）を開く
2) デベロッパーモード ON
3) 「パッケージ化されていない拡張機能を読み込む」→ `/private/extension` を指定
4) ツールバーの拡張アイコンから起動（またはショートカット）

## バージョン/変更
- AppVersionView: β0.5.5（`main.js`）
- 変更点（ログ冒頭）: 津波情報関連の表示を修正
- 紹介サイト: `/private/NDV-offical-site/ext/`（ガイド/デザインあり）

## 開発上の注意
- リリース前に `main.js` を terser 等で圧縮する運用コメントあり
- `eewLocalhostStreamPort` は公開時 0 を想定（現在 10520）
- NHK API キーは manifest にドメイン固定で参照（鍵の扱いに注意）
- WebAccessibleResources は拡張ページ内利用を想定（`matches: []`）

## 既知の制限/補足
- 外部API障害時のフォールバックは限定的
- 取得先多数のためネットワーク到達性が必要
- 一部UI/設定は Windows/Mac で見栄え差あり

## 移行（将来の独立アプリ化）に向けた観点（抜粋）
- 描画: Canvas（1080x128/128x128）の再実装（Electron/Canvas/Skia 等）
- データ取得: 現行 fetch/interval を Node/Electron（renderer/main）へ移植、CORS 不要化
- 音声: Web Audio 相当（Electron/Node + 音源再生）
- 設定保存: chrome.storage.sync → ファイル/IndexedDB/SQLite 等
- ショートカット/ウィンドウ制御: `chrome.windows` → Electron BrowserWindow/GlobalShortcut
- クリップボード等: Electron API への置換

---
この README は `manifest.json`、`scripts/*.js`、`popup2.html`、紹介サイト `/private/NDV-offical-site/ext/` の内容を元に、GPT-5が作成しています。
