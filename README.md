# Karaoke Kaiju｜YouTube 練唱 Chrome 擴充功能

Karaoke Kaiju 是一款以唱歌練習為單一目的的 Chrome 側邊面板工具。

目前版本：**0.1.0 公開測試版**。尚未上架 Chrome Web Store，請從本專案建置後以開發人員模式安裝。

## 公開測試版功能

- YouTube、YouTube Music 與支援的 HTML5 媒體偵測。
- `−12` 至 `+12` 半音升降 Key；每一格依十二平均律移動一個半音，播放速度不跟著改變。
- `−100` 至 `+100` cents 音高微調，以及標準／自然人聲兩種移調品質。
- `0.25×` 至 `4.0×` 速度控制。
- A–B 循環、片段保存與階梯式重複練習。
- 同一個分頁連續播放的個人歌單、上一首／下一首、依序播放與單曲循環。
- LRC、Enhanced LRC、SRT、WebVTT、TXT 歌詞匯入、時間微調、打拍對時與雙行 KTV 顯示。
- Chrome Sync 個人歌單與歌詞同步，不建立開發者自有帳號或後端資料庫。
- 繁體中文、English、日本語、简体中文，以及亮色／暗色主題。

公開建置不顯示尚未完成真實歌曲、隱私與跨裝置驗收的研究功能，也不宣告對應的外部 API 網域權限。

## 安裝與測試

需要 Node.js 22、pnpm 11 與 Chrome／Chromium。

```bash
pnpm install
pnpm run check
pnpm run package
```

1. 開啟 `chrome://extensions`。
2. 啟用「開發人員模式」。
3. 點選「載入未封裝項目」，選擇本專案的 `dist/`。
4. 開啟 YouTube 歌曲分頁，點一次工具列上的 Karaoke Kaiju 圖示。

`pnpm run package` 會產生 `release/karaoke-kaiju-v0.1.0.zip`；`release/` 已被 Git 忽略，不會把本機發布包誤提交到原始碼版本庫。

更完整的操作方式請見 [使用手冊](docs/USER_MANUAL.md)，測試流程請見 [測試說明](docs/TESTING.md)。

## 發布與開發分流

| 分支／建置 | 用途 | 實驗功能 |
| --- | --- | --- |
| `main` + `pnpm run build` | 對外公開測試與可發布封包 | 隱藏 |
| `develop` + `pnpm run build:development` | 日常研究與功能整合 | 顯示 |
| `codex/*`、`feature/*` | 單次功能或發布候選工作 | 依建置模式 |

所有變更都必須遵循 [統一開發流程](docs/DEVELOPMENT_PROTOCOL.md)：先定義驗收方式，再改程式，最後以 `pnpm run check` 的結構化結果收尾。正式發布前必須通過機密掃描、最小權限檢查、單元測試、正式建置、音高精度與 Chrome 端到端測試。

## 資料與隱私

- 核心音訊處理在使用者裝置上的 Web Audio 管線執行。
- 歌單、歌詞與練唱參數預設保存在擴充功能本機儲存空間。
- 只有使用者主動開啟 Chrome Sync 時，個人資料才會由 Chrome 同步到目前登入的 Google 帳號。
- 本專案不含廣告、第三方追蹤碼、預設 API Key 或開發者自有資料庫。

詳細內容請見 [隱私權政策](docs/PRIVACY_POLICY.md)。

## 專案文件

- [使用手冊](docs/USER_MANUAL.md)
- [測試與載入方式](docs/TESTING.md)
- [Chrome Web Store 上架指南](docs/CHROME_WEB_STORE_GUIDE.md)
- [隱私權政策](docs/PRIVACY_POLICY.md)
- [產品與驗收規格](docs/PROJECT_SPEC.md)
- [架構決策](docs/ARCHITECTURE_DECISIONS.md)
- [統一開發流程](docs/DEVELOPMENT_PROTOCOL.md)
- [0.1.0 公開發布資料審計](docs/PUBLIC_RELEASE_AUDIT.md)

## 授權

本專案使用 [MIT License](LICENSE)。第三方套件與參考專案仍各自適用其原授權與服務條款。
