# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**NDV (Natural Disaster Viewer)** は、緊急地震速報・地震情報・津波・気象警報などをリアルタイム表示する Chrome 拡張（Manifest V3）です。横長ティッカー（1080×128）と時計（128×128）を Canvas で描画し、音声読み上げも行います。

現在のバージョン: `β0.7.3`（manifest: `0.7.3`、`AppVersionCode: beta35`）

## インストール・起動（ローカル開発）

ビルドツールは不要です。Chrome に直接読み込みます。

1. Chrome で `chrome://extensions` を開く
2. デベロッパーモード ON
3. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリルートを指定
4. ツールバーアイコンまたは `Command+Shift+E`（Mac） / `Alt+Shift+V`（Windows）で起動

コード変更後は拡張のリロードボタンを押す（または `chrome://extensions` の更新ボタン）。

## リリース

GitHub に `v*` タグを push すると CI が自動で走ります。

```bash
git tag v0.7.x
git push origin v0.7.x
```

CI（`.github/workflows/release.yml`）は、`css`, `data`, `font`, `img`, `library`, `modules`, `sandbox`, `scripts`, `sound`, `*.html`, `manifest.json` を `extension/` にコピーして zip し、GitHub Release を作成します。`db/`, `memo/`, `.DS_Store`, `designanappicon-project_JP.key` は `.gitignore` により除外済みです。

リリース前に以下を更新する:
- `manifest.json` の `version`
- `scripts/main.js` の `AppVersionHistory`, `AppVersionCode`, `AppVersionView`, `SpeechVersionData`
- `RELEASE.md`（リリースノート本文として使用される）

## アーキテクチャ概要

### エントリポイント

| ファイル | 役割 |
|---|---|
| `scripts/background.js` | Service Worker。拡張アイコンクリック・コマンドでポップアップウィンドウを開く。`chrome.storage.sync` の初期値設定も担当 |
| `popup2.html` | メイン UI（1248×640）。以下のスクリプトを `<script>` タグで順次読み込む |
| `scripts/config.js` | URL定数（`RequestURL`）、フォントファミリー、`colorScheme`（light/dark/mono）の定義 |
| `scripts/main.js` | 約4,800行のコアロジック。各データ取得・表示・設定UI制御すべてを担う |

### `popup2.html` が読み込む主なスクリプト（順序）

1. `scripts/config.js` — 定数・カラースキーム
2. `scripts/data-*.js` 群 — 震源名・地域コード・気象警報種別などの静的データ
3. `library/` 群 — jQuery, jQuery UI, jszip 等
4. `scripts/init-canvas.js` — Canvas コンテキスト初期化（`#sample1`, `#sample2`）
5. `scripts/init-fontOperator.js` — カスタムフォント登録
6. `scripts/init-dataOperator.js` — `DataLoader`・`TrafficTracker` クラス定義、データ取得ユーティリティ
7. `scripts/init-speechController.js` — `AudioSpeechController` クラス（Web Audio API ベースの TTS キュー制御）
8. `scripts/main.js` — アプリ本体

### データフロー

- すべてのポーリングは `scripts/main.js` 内の `setInterval` / `requestAnimationFrame` で管理
- データ取得先 URL は `scripts/config.js` の `RequestURL` に集約
- 取得間隔は `chrome.storage.sync` の `settings.interval` に保存（初期値は `background.js` で設定）
- 各取得の最終時刻は `TrafficTracker` インスタンスが管理し、Traffic Monitor タブに表示

### 音声読み上げ

`AudioSpeechController`（`init-speechController.js`）が Web Audio API を使って音声ファイル（`sound/` 配下の `.wav`/`.mp3`）をキューで再生します。キューには `direct`・`path`・`id`・`wait`・`skip` の型を混在させて投入します。

### ストレージ

`chrome.storage.sync` のみ使用。キーは `mode0`（通常表示5項目）、`mode3`（ニュース速報）、`settings`（全設定）、`app`（バージョン管理）。

### 静的データファイル（`scripts/data-*.js`）

- `data-epicenter.js` — 震源コードと名称マッピング
- `data-AreaForecastLocalM.js` — 気象警報の地域コード
- `data-AreaForecastLocalEEW.js` 相当 — EEW 地域コード
- `data-SubdivisionArea.js` — 細分区域
- `data-JMAWarnTypeList.js` — JMA 警報種別リスト
- `data-multilingual-quake.js` / `data-multilingual-tsunami.js` — 多言語テキスト

### `modules/` について

`modules/jmaquake/` は JMA 地震データ型の TypeScript 型定義（`.d.ts`）のみ。`modules/dmdata/` は DM-Data API クライアント（`.mjs`）。現状どちらも本体の `main.js` に直接 import はされておらず、型参照・実験用途です。

## コマンド機能（通常表示の `<...>` プレースホルダ）

通常表示の「本文」に `<weather/temperature/high>` のように記述するとデータに展開されます。利用可能コマンド一覧: `disp-commands.html`

## バージョン更新時の注意

- `main.js` の `SpeechVersionData` には音声データのバージョンを記録する。未変更のスピーカーは空文字のまま
- `eewLocalhostStreamPort` は公開ビルド時に `0` にすること（現在 `10520`）
- `main.js` はリリース前に terser 等で圧縮する運用が想定されているが、現状ソースをそのまま配布している
