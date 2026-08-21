# Karaoke Kaiju 平台相容性

本文件記錄 `0.1.0` 公開測試版實際可承諾的瀏覽器範圍。相容性必須由自動測試或實機測試證明，不以「理論上相同」代替驗收。

## 支援矩陣

| 平台 | 安裝同一份 ZIP | 核心 Key／Fine Pitch | Speed／A–B／歌詞／歌單 | 目前結論 |
| --- | --- | --- | --- | --- |
| macOS Google Chrome 116+ | 是 | 是 | 是 | 支援；macOS ARM64、Chrome for Testing 152 自動驗收通過 |
| Windows Google Chrome 116+ | 是 | 是 | 是 | 支援；Windows x64、Chrome for Testing 152 自動驗收通過 |
| iPadOS Orion Browser | 可嘗試安裝 | 否，尚無可驗證的分頁音訊擷取路徑 | 僅部分功能可能可移植 | 不列為 `0.1.0` 支援平台 |

Windows 與 macOS 使用同一份 Manifest V3、JavaScript、WebAssembly 與發布 ZIP；程式沒有 OS 專用分支。最低 Chrome 116 是因為目前的音訊管線從 service worker 取得 `tabCapture` stream ID，再交給 offscreen document 處理。Chrome 官方也把這條 service worker → offscreen 擷取路徑標示為 Chrome 116 起可用：

- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome tabCapture API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [Chrome 分頁音訊擷取指南](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture)

## 自動驗收

本機已安裝 Chrome for Testing 時：

```bash
pnpm run build
pnpm run test:extension:cft
```

測試會下載官方 stable Chrome for Testing，載入目前 `dist/`，並驗證：

- 公開版 UI 與權限沒有洩漏研究功能。
- 擴充功能背景程序與分頁音訊工作階段可啟動。
- 十二平均律 Key、Fine Pitch、Speed 與 A–B 狀態可寫入並回讀。
- KTV 歌詞覆蓋層可掛載。
- 歌單切歌沿用同一分頁，保存參數與單曲循環正常。
- Chrome Sync 儲存可往返，console／background 錯誤為空。

`.github/workflows/desktop-compatibility.yml` 會在 `macos-latest` 與 `windows-latest` 使用完全相同的命令。Chrome 137 起，Chrome 品牌正式版移除了自動化使用 `--load-extension` 載入未封裝擴充功能的能力，因此 CI 使用官方 Chrome for Testing；Google Chrome Stable 的最終安裝仍保留人工「載入未封裝項目」驗收。[Chromium 追蹤議題](https://issues.chromium.org/issues/422991756)

2026-08-21 的 GitHub 驗收結果：Windows x64 與 macOS ARM64 都使用 Chrome for Testing `152.0.7977.54`，完整 smoke test 均為 `errors: []`；既有 Linux 標準發布檢查亦通過。這證明同一份公開建置可在兩個桌面作業系統運行；因自動化瀏覽器不等於使用者日常 Stable 安裝，正式商店發布前仍保留各一次人工聽感檢查。

## 為什麼 iPad Orion 目前不能共用完整功能

Orion 官方說明 iOS／iPadOS 可以安裝許多 Chrome／Firefox 擴充功能，但支援仍屬初期，而且受 Apple 平台 API 限制，不是所有擴充功能都能完整運作：[Orion iOS／iPadOS 擴充功能說明](https://help.kagi.com/orion/browser-extensions/ios-ipados-extensions.html)。

本專案目前有三個核心 Chrome API 依賴：

1. `chrome.sidePanel`：持續顯示控制面板。
2. `chrome.tabCapture`：取得正在播放的分頁音訊。
3. `chrome.offscreen`：在 Manifest V3 背景生命週期之外維持 Web Audio 處理。

Orion 官方 [WebExtensions API 支援表](https://docs.google.com/spreadsheets/d/14IgSRVop4psUTgtLZlvYJYrAArhvL3WvRlUdzdQbIoQ/edit?usp=sharing) 目前沒有列出 iOS／iPadOS 對這三項 API 的支援；`storage.sync` 只有部分支援，Chrome `identity.getProfileUserInfo` 也不在表內。這代表：

- 可以安裝不等於能啟動升降 Key 音訊管線。
- 不能承諾沿用 Chrome／Google 帳號同步資料。
- 即使把介面改成 Orion `sidebarAction`，仍未解決分頁音訊擷取與 offscreen Web Audio。

因此 `0.1.0` 不向 iPad Orion 使用者宣稱完整支援。未來若開發 Orion 版本，會先加入 API feature detection 與降級 UI；只有找到可重跑的 iPadOS 音訊擷取方案，並在實體 iPad 完成 Key 音質與背景穩定性驗收後，才會改列支援。

## 發布前人工檢查

### Windows／macOS Chrome Stable

1. 在 `chrome://extensions` 載入公開版 `dist/`。
2. 打開 YouTube 與 YouTube Music 各一首歌曲，點一次工具列圖示。
3. 驗證 Key `0 → +1 → -1 → 0` 不改變速度，Fine Pitch 與自然人聲模式可聽見差異。
4. 驗證 Speed、A–B、歌詞、同分頁下一首與單曲循環。
5. 關閉並重開側邊面板，確認歌曲參數與歌單仍在。

### iPad Orion 研究驗收

目前只記錄「能否安裝／哪些 API 缺失」，不以 UI 能開啟冒充核心功能可用。測試回報至少要包含 iPad 型號、iPadOS／Orion 版本、安裝方式、擴充功能錯誤與 Key 是否真的改變輸出音高。
