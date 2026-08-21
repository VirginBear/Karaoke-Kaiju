# 調唱（YouTube 卡拉 OK）Chrome 擴充功能

這個專案是一個操作簡單、反應極速、以「唱歌練習」為單一目的的 Chrome 桌面版擴充功能。

目前狀態：**版本 0.0.11（個人測試版）**
- **目前分頁音訊分析與 Groq Whisper 動態歌詞對時（需使用者主動同意與自備 Key）**
- **YouTube 串流解析為實驗性相容層；不保證平台改版後永遠可用**
- **瀏覽器視窗下方獨立三分之一歌詞欄（`dock-bottom`，18%～50% 拖曳調整，不遮擋影片）與懸停快速工具列**
- **側邊面板「逐句點播即唱」（Interactive Lyric Sheet，點句即跳轉播放，容器限縮平滑滾動不拉扯大視窗）**
- **歌詞逐句時間軸工作台（Timeline Editor）、多格式（LRC / SRT / WebVTT / TXT）自動解析與匯出、區段平移、版本復原、即時打拍對時（Tap-to-Time）與預唱前置時間（Lead Time）**
- **`unlimitedStorage` 宣告，容量仍受裝置與 Chrome 實際配額影響**
- **Groq API Key 不含預設值；個人測試輸入後只保存在本機，可從歌詞頁清除**

---

## 核心功能清單

- **即時移調與速度控制**：
  - YouTube 與一般 HTML5 audio/video 分頁音訊處理。
  - `−12` 到 `+12` 半音獨立升降 Key；每格嚴格對應十二平均律的一個半音（例如 C → C♯ → D），另有 `−100` 到 `+100` cents 微調。
  - 「標準」與具共振峰修正的「自然人聲」移調品質切換。
  - `0.25×` 到 `4.0×` 播放速度控制，保留音高。
  - 設定 A、B 點、啟用區段循環與一鍵清除。
  - 播放／暫停與前後跳轉秒數控制。
- **視窗版面與點唱體驗**：
  - **瀏覽器底部獨立歌詞欄（`dock-bottom`）**：固定於視窗底部佔 1/3，完全不遮擋影片；頂部把手支援 18%～50% 即時拖曳高度調整，雙擊復原 30%。
  - **懸停快速設定列**：滑鼠移近歌詞區即浮現時間偏移（±0.1s / ±0.5s / 重設）、字體縮放（A- / A+）與版面模式切換按鈕。
  - **側邊欄「逐句點播即唱」**：列出整首歌歌詞與時間碼，點擊任一句立即跳轉播放；隨歌曲播放自動平滑滾動追隨高亮，且滾動範圍限縮於歌詞容器內部，不拉扯側邊欄大視窗。
- **AI 動態歌詞與對時（選用）**：
  - **目前分頁音訊路徑**：在使用者啟動的分頁擷取音訊後，可交給 Groq Whisper 產生逐句／逐字時間戳；耗時取決於歌曲長度、網路與服務狀態。
  - **API Key 本機保存**：沒有內建或預填 Key；使用者輸入後保存於 `chrome.storage.local`，可隨時清除，公開發布包不含任何秘密。
- **歌詞多格式工作台與時間軸編輯**：
  - 支援 Standard LRC、Enhanced LRC、SRT、WebVTT 與純文字（TXT）自動解析匯入，並可一鍵匯出為 LRC／SRT／VTT（支援複製與下載）。
  - 單句開始/結束時間微調（±0.1s / ±0.5s）、一鍵對齊至目前時間、快速跳轉至該句、單句文字直接編輯、單句刪除與新增。
  - 歌詞區段批次平移（自此句往後平移 ±0.1s / ±0.5s）與「復原至原始版本」快照。
  - 即時打拍對時模式（Tap-to-Time）：支援 Space / Enter 鍵盤快捷鍵與敲擊對時。
  - 預唱前置時間（Lead Time）0.5s ~ 3.0s 滑桿自訂。
- **歌單與 Chrome Google 帳號跨電腦同步**：
  - 建立、改名、刪除多個練唱歌單；加入歌曲時一併保存 Key、cents、速度與 A–B 設定。
  - 點歌後在原本練唱分頁切換，不開新分頁；保存的練習參數自動套用。
  - 支援依序播放、自動下一首、上一首／下一首與單曲循環。
  - 使用 Chrome Sync 跨電腦同步歌單、歌詞、時間校正與顯示設定；無須第三方伺服器。
  - 宣告 `unlimitedStorage`，可在本機保存較大量歌曲與動態歌詞；實際容量依裝置與 Chrome 配額而定。
- **外觀、多語系與自訂設定**：
  - Chrome Side Panel 亮色／暗色雙主題，macOS／iOS 風格系統設計。
  - 繁體中文、English、日本語、简体中文四種完整介面語言。

---

## 參考專案與技術文獻

- **SmartTube (Android TV YouTube Client)**:
  - [SmartTube 官方首頁](https://smarttubeapp.github.io/)
  - [SmartTube GitHub 原始碼與釋出版本](https://github.com/yuliskov/SmartTube/releases)
  - [SmartTube F-Droid 套件](https://f-droid.org/packages/app.smarttube.fdroid/)
  - *參考重點：多客戶端串流解析思路；本專案不保證繞過平台改版、403 或 DRM 限制。*
- **Chrome 擴充套件上架與規範指南**:
  - [筆記：從零開始製作 Chrome 套件到上架商店 (Medium)](https://medium.com/%E9%BA%A5%E5%85%8B%E7%9A%84%E5%8D%A1%E6%8B%89ok)
  - [docs/CHROME_WEB_STORE_GUIDE.md](docs/CHROME_WEB_STORE_GUIDE.md)
  - [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)
- **Groq Whisper API**:
  - [Groq Audio Speech-to-Text API Documentation](https://console.groq.com/docs/speech-text)
  - *參考重點：`whisper-large-v3` 多粒度詞級時間戳（Word-level timestamps）與高速轉錄。*

---

## 文件入口

- [Chrome Web Store 上架指南](docs/CHROME_WEB_STORE_GUIDE.md)
- [隱私權政策 (Privacy Policy)](docs/PRIVACY_POLICY.md)
- [產品需求與驗收規格](docs/PROJECT_SPEC.md)
- [架構決策紀錄](docs/ARCHITECTURE_DECISIONS.md)
- [開發紀錄](docs/DEVELOPMENT_LOG.md)
- [Phase 0 驗收報告](docs/PHASE0_REPORT.md)
- [介面規格](docs/UI_SPEC.md)
- [介面忠實度檢查](docs/UI_FIDELITY.md)
- [測試與載入方式](docs/TESTING.md)
- [統一開發流程](docs/DEVELOPMENT_PROTOCOL.md)
- [目前待辦](TODO.md)

---

## 本機建置與打包

```bash
# 安裝相依套件
pnpm install

# 執行全套檢查（TypeScript 型別、單元測試、建置、DSP 音高與 Playwright smoke test）
pnpm run check

# 一鍵打包 Chrome Web Store 上架封裝檔 (.zip)
pnpm run package
```

- 建置結果位於 `dist/`。
- 上架安裝包位於 `release/diaochang-v0.0.11.zip`（每次原始碼變更後須重新打包）。
- 載入測試：至 Chrome 網址列開啟 `chrome://extensions`，啟用右上角「開發人員模式」，點擊「載入未封裝項目」並選取專案中的 `dist/` 資料夾。開啟 YouTube 歌曲分頁後，點擊工具列「調唱」圖示即可使用。
