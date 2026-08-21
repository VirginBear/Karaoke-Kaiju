# Chrome Web Store 上架完整指南與審查備忘錄

本文件整理了將「調唱（Diaochang）」Chrome 擴充功能上架至 **Google Chrome 應用程式商店（Chrome Web Store）** 的完整流程、所需素材規格、商店文案與隱私權審查填寫範本。

---

## 📌 目錄
1. [前置準備與開發者帳號註冊](#1-前置準備與開發者帳號註冊)
2. [商店刊登資訊與文案 (Store Listing)](#2-商店刊登資訊與文案-store-listing)
3. [圖片與視覺素材規格 (Graphic Assets)](#3-圖片與視覺素材規格-graphic-assets)
4. [隱私權與權限合理性說明 (Privacy & Permissions)](#4-隱私權與權限合理性說明-privacy--permissions)
5. [封裝打包與自動化指令 (Packaging)](#5-封裝打包與自動化指令-packaging)
6. [審查提交與發布注意事項 (Review & Maintenance)](#6-審查提交與發布注意事項-review--maintenance)

---

## 1. 前置準備與開發者帳號註冊

1. **Google 帳號安全性**：
   - 上架專用的 Google 帳號必須開啟 **「兩步驟驗證（2-Step Verification / 2FA）」**。
2. **進入開發者控制台**：
   - 前往 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)。
3. **支付一次性註冊費**：
   - 首次註冊 Chrome 開發者帳號需支付一次性 **$5 美元** 註冊費用（使用信用卡線上扣款）。
4. **填寫帳號基本資訊**：
   - **發布者名稱（Publisher Name）**：可填寫個人暱稱、團隊名稱或 Studio 名稱（例如：`調唱開發團隊` 或 `Diaochang Studio`）。
   - **聯絡 Email（Contact Email）**：填寫接收 Google 官方審查通知與使用者支援的有效信箱。

---

## 2. 商店刊登資訊與文案 (Store Listing)

### 2.1 基本資訊
- **擴充功能名稱 (Name)**：`調唱｜唱歌練習`（英文：`Diaochang - Karaoke & Singing Practice`）
- **簡短說明 (Summary)** (限制 132 字元以內)：
  > 在 YouTube 與網頁媒體上自然升降 Key、微調音高、變速、A–B 循環練唱、動態雙行 KTV 歌詞與個人歌單同步。
- **分類 (Category)**：`娛樂 (Entertainment)` 或 `生產力工具 (Productivity)`
- **主要語言 (Default Language)**：`繁體中文 (Chinese Traditional)`

---

### 2.2 詳細說明 (Detailed Description) 範本

在 Chrome Web Store 後台的「詳細說明」欄位中，可直接複製以下 Markdown / 純文字格式貼上：

```text
🎤 調唱（Diaochang）— 專為歌唱愛好者打造的 YouTube 練唱神器！

想在 YouTube 上練歌卻發現原曲 Key 太高或太低？想要放慢速度聽清楚轉音細節？或者想要反覆循環練習副歌段落？
「調唱」是一款操作極簡、低延遲、無廣告干擾的 Chrome 側邊面板練唱工具，讓你在瀏覽 YouTube 時隨時調整音高、速度與段落，輕鬆找到最適合自己的歌唱音域！

━━━━━━━━━━━━━━━━━━━━━
✨ 核心特色與功能
━━━━━━━━━━━━━━━━━━━━━

🎵 1. 獨立升降 Key 與自然人聲共振峰修正
• −12 至 +12 半音精準移調：嚴格遵循十二平均律（例如 C → C♯ → D），升降調不影響播放速度。
• −100 至 +100 cents 微調：支援 A4 432 / 440 / 442 Hz 基準音切換，滿足合唱與特殊調律需求。
• 自然人聲模式（Natural Vocal）：內建 LPC 共振峰修正演算法，大幅減少升降 Key 時產生的「花栗鼠音」或「巨人音」，保留人聲真實溫暖度。

⚡ 2. 速度自由變換與 A–B 段落循環
• 0.25× 至 4.0× 變速不變調：放慢速度仔細抓音準、加快節奏訓練嘴速。
• A–B 重複練習：一鍵標記起點 A 與終點 B，無縫循環最難唱的樂句。

📜 3. 動態雙行 KTV 歌詞與工作台
• 影片浮動歌詞：在 YouTube 影片下方以雙行交替呈現歌詞，白字底、系統藍進度條由左至右平滑推進，下一句提前預覽。
• 多格式支援：支援 LRC、Enhanced LRC（逐字時間碼）、SRT 字幕、WebVTT 與純文字匯入。
• 逐句時間軸編輯器：可微調單句時間（±0.1s / ±0.5s）、一鍵對齊目前播放時間、快速跳轉至該句、批次區段平移與一鍵復原原始版本。
• 即時打拍對時（Tap-to-Time）：按下 Space / Enter 鍵隨歌曲即時敲擊標記時間戳記。
• 歌詞匯出：支援將校正後的歌詞匯出為 LRC、SRT 與 WebVTT 檔案或複製至剪貼簿。

📁 4. 個人練唱歌單與 Chrome Google 帳號同步
• 一鍵加入歌單：將常練歌曲加入自訂歌單，自動記錄專屬的 Key、cents、速度與 A–B 段落。
• 同分頁連續播放：點歌自動在原分頁載入並套用參數，支援單曲循環與依序播放。
• Chrome 帳號同步：無須註冊額外帳號，透過 Chrome 內建 Google Sync 跨電腦自動還原個人歌單與歌詞。

🤖 5. 目前分頁 AI 動態歌詞（選用自備金鑰）
• 支援直接錄製目前 YouTube 分頁音訊並透過 Groq Whisper AI 快速生成時間碼。
• 隱私安全承諾：公開版本不含預設 API Key；使用者輸入的 Key 只保存於本機擴充功能儲存空間，可由歌詞頁清除，音檔不經開發者伺服器中轉。

━━━━━━━━━━━━━━━━━━━━━
🔒 隱私安全與承諾
━━━━━━━━━━━━━━━━━━━━━
• 本機優先（Local-First）：移調、變速、BPM 與一般音訊運算在瀏覽器本機完成；AI 歌詞是使用者明確同意後的選用外部服務。
• 無廣告、無第三方追蹤代碼，絕不收集或轉售您的個人資料。
• 免費開源，專注打造最純粹的練唱體驗！

立即安裝「調唱」，享受隨心所欲的歌唱練習時光！🎶
```

---

## 3. 圖片與視覺素材規格 (Graphic Assets)

Google Chrome Web Store 對圖形資產有嚴格的解析度要求：

| 素材類型 | 尺寸規格 | 格式 | 必要性 | 用途說明 |
| :--- | :--- | :--- | :--- | :--- |
| **擴充功能圖示** | `128 x 128 px`<br>`48 x 48 px`<br>`32 x 32 px`<br>`16 x 16 px` | PNG | **必備** | 擴充功能列表、Chrome 工具列與管理頁顯示（已內建於 `public/icons/`）。 |
| **小宣傳圖 (Small Tile)** | `440 x 280 px` | PNG / JPEG | **必備** | Chrome Web Store 搜尋結果與類別列表顯示的主要卡片。 |
| **大宣傳圖 (Marquee / Large Tile)** | `1400 x 560 px` 或 `920 x 680 px` | PNG / JPEG | 推薦 | 登上 Chrome Web Store 首頁精選輪播推薦時使用。 |
| **螢幕截圖 (Screenshots)** | `1280 x 800 px` 或 `640 x 400 px` | PNG / JPEG | **必備（至少 1 張，建議 4~5 張）** | 商店商品頁面詳細展示圖。 |

### 📸 截圖建議規劃（5 張）：
1. **截圖 1：練唱主介面** — 展示 YouTube 側邊面板、Key 升降 (+2)、自然人聲開關、變速 (0.85×) 與 A-B 循環按鈕。
2. **截圖 2：YouTube 雙行 KTV 浮動字幕** — 展示影片下三分之一雙行藍色填色歌詞與當前句/下一句預覽。
3. **截圖 3：歌詞時間軸編輯工作台** — 展示逐句時間碼微調、快速跳轉、自此句往後平移與打拍對時。
4. **截圖 4：個人練唱歌單與同步** — 展示自訂歌單、歌曲 preset（Key/速度標籤）、Chrome Sync 帳號同步。
5. **截圖 5：設定與客製化介面** — 展示四國語言切換、按鍵大小 (精簡/舒適/加大)、快捷鍵配置與深色模式。

---

## 4. 隱私權與權限合理性說明 (Privacy & Permissions)

在 Chrome Developer Dashboard 的 **「Privacy practices（隱私權實務）」** 標籤頁中，必須填寫以下資料：

### 4.1 單一用途宣告 (Single Purpose)
```text
調唱（Diaochang）是一款專為歌唱愛好者設計的瀏覽器輔助工具，為使用者在 YouTube 與網頁媒體上提供即時音高升降（Key 調節）、播放速度調整、A–B 樂句循環練習與 KTV 雙行歌詞同步顯示。
```

### 4.2 權限合理性宣告 (Permissions Justification)
針對 manifest 中請求的每項權限，填寫以下說明（可直接複製）：

- **`tabCapture`**:
  > 用於在使用者點擊擴充功能圖示後，即時擷取目前分頁的音訊串流，以傳入 AudioWorklet DSP 節點進行十二平均律移調（升降 Key）、共振峰修正與變速播放。
- **`offscreen`**:
  > 依據 Chrome Manifest V3 規範，在獨立的背景 offscreen document 建立 AudioContext 與音訊處理節點，確保低延遲音訊運算不阻塞介面。
- **`storage`**:
  > 用於在使用者本機儲存練唱歌單、歌曲專屬練習設定（Key、速度、A-B 點）與歌詞內容。
- **`unlimitedStorage`**:
  > 移除本機預設 10MB 儲存上限，確保使用者能離線儲存大量歌曲之逐字（word-level）動態歌詞、多個練習歌單與自訂時間軸資料。
- **`identity` / `identity.email`**:
  > 用於識別使用者目前登入 Chrome 的個人檔案身分，以便透過 Chrome Sync API 跨裝置同步個人歌單與歌詞設定。
- **`scripting` / `activeTab`**:
  > 用於在使用者開啟練習面板時，在當前 YouTube 影片播放器或瀏覽器底部掛載 Shadow DOM 動態歌詞欄與懸停工具列。
- **`host_permissions` (`https://*.youtube.com/*`, `https://*.googlevideo.com/*`)**:
  > 用於在 YouTube 與 YouTube Music 頁面上偵測影片播放進度、控制跳轉與呈現歌詞覆蓋層；若使用者主動啟用 AI 歌詞，才會擷取目前分頁音訊供 Groq 解析時間戳。
- **`optional_host_permissions` (`https://api.groq.com/*`)**:
  > 僅在使用者主動啟用 AI 歌詞時間碼功能並點擊產生時，發送請求至 Groq 官方 API 進行語音轉文字。

### 4.3 資料使用實務勾選 (Data Usage)
- **是否收集個人可識別資訊？**：選擇 **否 (No)**。
- **是否轉售使用者資料？**：選擇 **否 (No)**。
- **是否用於信用評估或貸款？**：選擇 **否 (No)**。
- **是否用於個人化廣告？**：選擇 **否 (No)**。
- **公開隱私權政策網址 (Privacy Policy URL)**：
  填寫已發布之 `docs/PRIVACY_POLICY.md` 網址（例如：`https://github.com/<your-username>/<repo>/blob/main/docs/PRIVACY_POLICY.md`）。

---

## 5. 封裝打包與自動化指令 (Packaging)

Chrome Web Store 要求上傳 `.zip` 格式的封裝檔。

### 5.1 一鍵自動打包指令
我們在專案中提供了專屬的打包腳本：

```bash
# 執行全套型別檢查、測試、建置並自動生成上架用 zip 檔
pnpm run package
```

產生的上架封裝檔將存放於：
📁 `release/diaochang-v0.0.11.zip`

### 5.2 封裝檔內容檢查清單
自動打包腳本已確保封裝檔內**僅包含**上架必要檔案：
- ✅ `manifest.json`
- ✅ `service-worker.js`
- ✅ `media-controller.js`
- ✅ `sidepanel.html`
- ✅ `offscreen.html`
- ✅ `assets/` (打包後的 JS 與 CSS)
- ✅ `icons/` (16, 32, 48, 128 px 圖示)
- ✅ `_locales/` (zh_TW, en, ja, zh_CN 多國語言字典)
- ❌ 自動排除 `src/`, `docs/`, `tests/`, `node_modules/`, `.git/` 與任何暫存檔。

---

## 6. 審查提交與發布注意事項 (Review & Maintenance)

### 6.1 提交前自我檢核
- [ ] 執行 `pnpm run check` 確認型別、單元測試、DSP 音高與 smoke test 全數通過。
- [ ] 執行 `pnpm run package` 產出最新版 `release/diaochang-vX.X.X.zip`。
- [ ] 在 `chrome://extensions` 載入 `dist/` 資料夾進行實際 YouTube 練唱操作測試。
- [ ] 準備好 440x280 小宣傳圖與至少 1 張 1280x800 螢幕截圖。
- [ ] 確認隱私權政策網址可公開存取。

### 6.2 審查時間與狀態
- **審查時間**：一般擴充功能審查約需 **1 至 3 個工作天**（若包含 `tabCapture` 與 `host_permissions`，審查時間可能略長，但我們已提供完整的用途說明以利加速審查）。
- **審查通過**：狀態轉為「Published（已發布）」，全球使用者即可在 Chrome Web Store 免費搜尋並安裝。
- **後續更新**：未來釋出新版本時，只需於 `package.json` 與 `manifest.json` 更新版本號（如 `0.0.11`），執行 `pnpm run package`，至後台點擊「Upload updated package」並提交審查即可。
