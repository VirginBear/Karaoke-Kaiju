# 調唱（YouTube 卡拉 OK）開發待辦清單

- 文件版本：1.0
- 更新日期：2026-08-18
- 產品階段：版本 0.0.11；核心練唱、歌單、歌詞工作台已完成，BPM 自動偵測已接上真實音訊分析；現正進行實機回歸與人聲分離可行性研究
- 使用方式：完成項目打勾，並在開發紀錄補上驗證結果；未經測試不得標記為完成

## 使用者目前最需要驗證的流程

- [ ] 在日常 Chrome 載入 `dist/` 0.0.11，重新整理 YouTube 分頁。
- [ ] 從目前歌曲分頁點一次「調唱」圖示，確認出現「音訊處理中」。
- [ ] 使用 YouTube／YouTube Music 的目前分頁音訊產生 AI 動態時間碼。
- [ ] 確認 AI 錄製完成後會恢復原本的速度、A–B、播放位置與播放狀態。
- [ ] 實際測試《花香》歌詞的雙行 KTV 顯示、藍色進度與時間微調。
- [ ] 測試同一個 Chrome／Google Sync 帳號在另一台電腦恢復歌單與歌詞設定。
- [ ] 收集使用者體驗回饋：音質、延遲、歌詞準確度、按鈕手感、文字理解度。
- [ ] 實機驗證 BPM「自動偵測」：播放節奏清楚的歌曲，等待約 8 秒，記錄 BPM 與信心度；比較 TAP 測速誤差。

## 已完成（保留作為回歸基準）

### 核心練唱

- [x] YouTube 媒體偵測與目前分頁啟動流程。
- [x] 十二平均律升降 Key：`−12` 至 `+12` 半音。
- [x] cents 微調與 A4 432／440／442 Hz 參考設定。
- [x] Key 與速度獨立調整，不以變速代替移調。
- [x] 自然人聲／標準音訊模式切換。
- [x] 速度調整、快捷速度與一鍵重設。
- [x] A–B 循環、單曲循環、上一首／下一首與依序播放。
- [x] 歌曲切換時維持同一個分頁與側邊面板，不建立新視窗。

### 介面與設定

- [x] macOS／iOS 風格的中性亮色與暗色主題。
- [x] Key、Fine Pitch、Speed、A–B、播放控制模組化面板。
- [x] 設定入口、按鈕大小、可見控制模組、快捷鍵與語言切換。
- [x] 繁體中文、English、日本語、简体中文。
- [x] 最近歌曲、本機歷史與歌曲 preset。

### 歌單與同步

- [x] 建立、改名、刪除多個本機歌單。
- [x] 將目前歌曲加入歌單並保存 Key、cents、速度、A–B。
- [x] 從歌單點歌時更新目前 YouTube 分頁並自動套用 preset。
- [x] 單曲循環與歌單依序播放。
- [x] 使用 Chrome Sync 與目前 Google／Chrome 帳號同步歌單。
- [x] 同步資料採 local-first、分塊儲存、checksum 與 newest-wins。
- [ ] 以相同 Chrome／Google Sync 帳號在第二台電腦完成跨裝置驗收，並記錄同步延遲與配額。

### 歌詞、時間軸與多格式工作台

- [x] LRC／Enhanced LRC 匯入與歌曲 URL 綁定。
- [x] SRT、WebVTT、純文字（TXT）自動偵測與解析匯入。
- [x] 歌詞匯出為 Standard LRC、SRT、WebVTT（支援剪貼簿複製與檔案下載）。
- [x] YouTube 下方三分之一獨立底部歌詞欄（`dock-bottom`，高度 18vh~50vh 可自由拖拽，雙擊復原 30vh）。
- [x] 底部歌詞欄滑鼠懸停快速工具列（時間偏移 ±0.1s / ±0.5s / 重置、字體縮放 A- / A+、模式切換）。
- [x] 側邊面板「逐句點播即唱」（Interactive Lyric Sheet）：點擊任意歌詞句立即跳轉（`SEEK_ABSOLUTE`）並開始播放，隨播放自動平滑滾動並標記高亮。
- [x] 影片內嵌（`video-overlay`）與底部獨立欄（`dock-bottom`）自由切換。
- [x] 白色歌詞、系統藍色進度填色與逐句／逐字時間支援。
- [x] 預唱前置時間（Lead Time）0.5s 至 3.0s 滑桿自訂，影片與面板雙向生效。
- [x] 歌詞逐句時間軸編輯器：單句開始/結束時間微調（±0.1s / ±0.5s）、一鍵對齊目前時間、單句文字直接編輯、單句刪除與新增。
- [x] 歌詞區段批次平移（自此句往後平移 ±0.1s / ±0.5s）。
- [x] 歌詞原始版本快照與一鍵復原。
- [x] 即時打拍對時模式（Tap-to-Time）：支援 Space / Enter 鍵盤快捷鍵與介面敲擊對時。
- [x] 歌詞整體 offset 的 ±0.5 秒快速調整與 ±0.1 秒細調。
- [x] 字體大小、遮罩透明度、歌詞框上下位置調整。
- [x] 歌詞覆蓋層內的播放、跳轉、A、B、循環與清除控制。
- [x] 歌詞、時間校正與顯示設定選用 Chrome Sync。
- [x] 本機音訊檔案送至 Groq 產生 segment／word timestamps。
- [x] 直接高速擷取目前 YouTube／YouTube Music 音訊串流（Opus / AAC 1～2秒完成），秒級直傳 Groq 產生時間碼（免等待 4 分鐘播放）。
- [x] AI 解析期間顯示即時動態提示，完成後直接呈現動態歌詞，不干擾目前播放進度與狀態。
- [x] API Key 沒有內建預設值；個人測試輸入後只保存於 `chrome.storage.local`，歌詞頁可清除。
- [x] 內容腳本 Extension Context Invalidation 優雅退場與防護機制。

## P0：下一步必做

### 1. 完成目前 YouTube AI 動態歌詞的真實使用驗收

- [ ] 用至少三首不同長度、不同語言歌曲測試分頁錄製。
- [ ] 測試 YouTube 與 YouTube Music 各一首。
- [ ] 測試歌曲中途開始、暫停後重新產生、取消後重新產生。
- [ ] 確認 15 分鐘與 25 MB 限制會顯示清楚錯誤，不會破壞音訊引擎。
- [ ] 確認 Groq 失敗、網路中斷、Key 無效時能保留原本歌曲播放。
- [ ] 比較 Groq 結果與人工歌詞，記錄 offset 誤差與常見辨識錯誤。

### 2. 歌詞進階排版與自訂樣式

- [ ] 增加歌詞框左右位置、最大寬度與圓角自訂設定。
- [ ] 增加當前句／下一句的字重、行距與對齊設定。
- [ ] 增加藍色進度填色速度與提前顯示開關。
- [ ] 確保亮色／暗色主題下歌詞仍符合對比度要求。
- [ ] 在 320、420、側邊面板最小寬度下檢查無水平溢出。

### 3. BPM 自動偵測

- [x] 從目前已啟動的分頁音訊建立獨立 AnalyserNode 節奏包絡。
- [x] 以自相關搜尋 40–220 BPM，並處理半速／雙速歧義與信心度。
- [x] 無節奏、靜音、音訊未啟動時顯示可理解的失敗提示。
- [ ] 用 YouTube、YouTube Music、本機音訊各至少驗證三首歌曲，建立誤差紀錄。
- [ ] 評估長前奏、半拍／切分節奏、現場錄音與多段落歌曲的誤判率。

## P1：歌單、Google Sync 與跨裝置體驗

- [ ] 歌單拖曳排序。
- [ ] 歌曲備註與練唱目標欄位。
- [ ] 歌單搜尋、篩選、最近播放與最愛歌曲。
- [ ] JSON 匯出與匯入，提供資料備份與搬移。
- [ ] 顯示同步狀態、最後同步時間與衝突提示。
- [ ] 針對離線後多台裝置同時修改，設計可理解的衝突處理 UI。
- [ ] 研究歌詞超過 Chrome Sync 配額後的 Drive `appDataFolder` 方案。
- [ ] 明確說明 Chrome Sync 與 Google Drive 的資料位置、容量與刪除行為。
- [ ] 驗收：另一台登入相同 Chrome／Google Sync 帳號的電腦能恢復歌單、preset、歌詞與顯示設定。

## P1：更多網站與媒體相容性

- [ ] 建立平台相容性矩陣：YouTube、YouTube Music、SoundCloud、Vimeo、Spotify Web 等。
- [ ] 每個平台確認媒體偵測、tab capture、播放控制、切歌與 URL 正規化。
- [ ] 對不支援的 DRM 或無法擷取音訊頁面顯示清楚原因。
- [ ] 不加入 `<all_urls>`；每個正式支援平台採最小必要權限。
- [ ] 建立每平台的 smoke test 與手動驗收 URL。

## P2：音訊品質與練唱進階功能

### 人聲降低／伴奏

- [ ] 先實作即時 Mid/Side 或中央聲道消減原型。
- [ ] UI 使用「人聲降低」名稱，不宣稱完全去人聲。
- [ ] 比較中央聲道消減對主唱、鼓、貝斯與殘響的影響。
- [ ] 評估 UVR／Demucs／MDX／VR／Roformer 模型與 ONNX Runtime Web + WebGPU 的本機 AI 分軌可行性。
- [ ] 量測模型大小、記憶體、CPU／GPU、啟動時間與 Chrome 相容性。
- [ ] 只在本機處理，不上傳到開發者伺服器。
- [ ] 以固定歌曲測試集比較目前 Mid/Side、UVR/Demucs、雲端分離的殘留人聲、伴奏失真、延遲與取消復原。
- [ ] 線上 UVR 只列為使用者主動上傳的外部選項；未完成隱私與授權審查前，不整合為預設流程。

### 音訊引擎

- [ ] 量測長時間播放的音畫同步漂移。
- [ ] 量測不同 Key／速度組合下的延遲、underrun、爆音與 CPU。
- [ ] 比較標準、自然人聲與後續高品質音訊引擎。
- [ ] 研究低延遲模式與品質模式的清楚取捨。
- [ ] 加入音訊引擎錯誤復原與重新連接流程。

## P2：產品完成度與發布前工作

- [ ] 完成首次使用引導：啟動分頁、開始練唱、調 Key、設定 A–B。
- [x] 準備 Chrome Web Store 上架完整指南與審查清單（[docs/CHROME_WEB_STORE_GUIDE.md](docs/CHROME_WEB_STORE_GUIDE.md)）。
- [x] 完成雙語隱私權政策文件（[docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)）。
- [x] 新增一鍵自動打包指令 `pnpm run package` 生成 `release/diaochang-vX.X.X.zip`。
- [x] 檢查 Chrome Web Store 最小權限、隱私揭露與權限合理性說明（Single Purpose & Permission Justifications）。
- [ ] 準備 440x280 小宣傳圖與 1280x800 商店展示截圖。
- [ ] 增加權限說明與撤銷權限入口。
- [ ] 增加隱私說明：分頁音訊、Groq、Chrome Sync、API Key 的資料流向。
- [ ] 增加支援／疑難排解頁面，涵蓋 activeTab、tab capture 與媒體找不到。
- [ ] 鍵盤快捷鍵全部可關閉，避免影響 YouTube 本身操作。
- [ ] 完成無障礙檢查：鍵盤操作、焦點、ARIA、顏色對比與 reduced motion。
- [ ] 建立正式版本變更紀錄與遷移策略。
- [ ] 進行 10 分鐘與長歌曲穩定性測試。
- [ ] 進行至少三位使用者的可用性測試，再決定是否進入公開測試。

## 明確不列入目前 MVP

- 不下載、破解、重新託管或轉存 YouTube／串流平台媒體。
- 不繞過 DRM、付費牆或平台限制。
- 不自動從網路抓取或散布受著作權保護的完整歌詞。
- 不建立開發者自有雲端資料庫保存個人歌單或歌詞。
- 不先做手機 Chrome；第一發行目標是桌面版 Chrome。

## 每次開發完成前的固定驗收

- [ ] `pnpm run check` 通過。
- [ ] 相關單元測試與 extension smoke test 通過。
- [ ] `dist/manifest.json` 版本與文件版本一致。
- [ ] 亮色、暗色與四種語言至少各檢查一次。
- [ ] 320 × 900 與 420 × 900 無水平溢出。
- [ ] 失敗流程有可理解的中文提示與下一步操作。
- [ ] 更新 `docs/DEVELOPMENT_LOG.md`，記錄變更、驗證結果、風險與下一步。
- [ ] 更新 `docs/TESTING.md`，補上可重跑的測試步驟。
- [ ] 以 `docs/DEVELOPMENT_PROTOCOL.md` 與根目錄 `AGENTS.md` 作為 Gemini、Codex 與人工工程師的共同交接標準。
- [ ] 未完成的功能不得在設定頁標示為已支援。

## 相關文件

- 商店上架指南：[docs/CHROME_WEB_STORE_GUIDE.md](docs/CHROME_WEB_STORE_GUIDE.md)
- 隱私權政策：[docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)
- 產品規格：[docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)
- 測試方式：[docs/TESTING.md](docs/TESTING.md)
- 開發紀錄：[docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md)
- 架構決策：[docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md)
- UI 規格：[docs/UI_SPEC.md](docs/UI_SPEC.md)
