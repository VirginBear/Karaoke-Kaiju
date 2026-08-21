# Karaoke Kaiju 0.1.0 Chrome Web Store 上架指南

這份文件只描述 0.1.0 公開測試版。尚未通過驗收的研究功能不得放入商店截圖、文案、權限或發布包。

## 商店資訊

- 名稱：`Karaoke Kaiju`
- 分類：娛樂
- 建議摘要：

> 在 YouTube 上自然升降 Key、微調音高、變速、A–B 循環練唱，並管理個人歌單與雙行 KTV 歌詞。

建議詳細說明：

```text
Karaoke Kaiju 是一款專為唱歌練習打造的 Chrome 側邊面板工具。

• −12 至 +12 半音精準升降 Key，每格依十二平均律移動一個半音
• Fine Pitch cents 微調與自然人聲音質模式
• 0.25× 至 4.0× 速度控制
• A–B 循環、片段保存與階梯式重複練習
• 同分頁個人歌單、依序播放與單曲循環
• LRC／SRT／VTT／TXT 匯入、時間校正與雙行 KTV 歌詞
• Chrome Sync 跨裝置保存個人歌單與歌詞
• 繁體中文、English、日本語、简体中文與亮暗主題

核心音訊在使用者裝置上處理；沒有廣告、第三方追蹤或開發者自有資料庫。
```

## 圖片

| 素材 | 尺寸 | 狀態 |
| --- | --- | --- |
| 擴充功能圖示 | 16、32、48、128 px PNG | `public/icons/` 已完成 |
| 小宣傳圖 | 440 × 280 | 上架前製作 |
| 商店截圖 | 1280 × 800 或 640 × 400 | 建議 5 張 |

截圖只能展示公開建置：練唱主面板、雙行歌詞、歌詞時間微調、歌單與 Chrome Sync、設定與四語／亮暗主題。

## 權限說明

- `tabCapture`：在使用者點擊圖示後擷取目前分頁音訊，進行即時升降 Key。
- `offscreen`：在 Manifest V3 背景文件執行 Web Audio／AudioWorklet。
- `storage`、`unlimitedStorage`：保存個人歌單、練唱參數與歌詞時間碼。
- `identity`、`identity.email`：顯示目前 Chrome 個人檔案登入狀態並提供選用 Chrome Sync。
- `activeTab`、`scripting`：使用者主動啟用後偵測目前媒體並掛載 KTV 歌詞。
- `sidePanel`：顯示固定的練唱面板。
- YouTube／YouTube Music：讀取支援網站的媒體狀態、控制播放與呈現歌詞。

公開 `dist/manifest.json` 不得包含 `oauth2` 或 `optional_host_permissions`。`pnpm run test:release` 會自動阻擋這類誤發布。

## 打包與提交

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run package
```

上傳檔案：`release/karaoke-kaiju-v0.1.0.zip`

提交前必須確認：

- `pnpm run check` 全部 PASS。
- `package.json`、來源 Manifest、建置 Manifest 與官網版本一致。
- 發布包沒有 API Key、OAuth 設定、`.env`、模型、測試素材或原始碼。
- 隱私權政策已使用可公開存取的網址。
- 至少在 YouTube 與 YouTube Music 各完成一次實機練唱。
- 商店文案與截圖沒有出現開發建置的研究功能。

GitHub Actions 會在 PR 與 `main`／`develop` push 執行同一套標準化驗收並保存 14 天的測試封包。
