# 調唱（Diaochang）隱私權政策 / Privacy Policy

> 最近更新日期：2026 年 8 月 18 日 / Last Updated: August 18, 2026

「調唱」（以下簡稱「本擴充功能」或「我們」）是一款專為使用者在 YouTube 與網頁媒體上進行歌唱練唱（包含升降 Key、微調音高、變速、A–B 循環與歌詞同步）設計的 Google Chrome 桌面版擴充功能。

我們非常重視您的個人隱私。本隱私權政策旨在清楚說明本擴充功能如何處理您的資料、權限使用目的以及我們的隱私承諾。

---

## 繁體中文版 (Traditional Chinese)

### 1. 我們收集哪些資料？
本擴充功能採用 **「本機優先（Local-First）」** 架構。我們沒有自己的後端資料庫，不會在開發者伺服器收集、儲存或轉售您的個人身分資料、瀏覽紀錄或音訊檔案；若您選用 Groq AI 歌詞，音訊會在明確同意後直接傳送給 Groq。

- **練唱參數與歌單資料**：您建立的歌單名稱、歌曲 URL、Key（升降半音）、音高微調（cents）、播放速度、A–B 循環點與自訂歌詞等，均儲存在您瀏覽器本機的 `chrome.storage.local`。
- **Google 帳號與 Chrome Sync（選用功能）**：若您主動在設定中啟用「Google 帳號同步」，擴充功能會使用 Chrome 內建的 `chrome.storage.sync` API 將您的歌單與歌詞設定加密同步至您已登入的 Google Chrome 帳戶中。我們不會取得您的 Google 密碼或未授權的帳戶資訊。
- **AI 歌詞時間碼產生（BYOK 自備金鑰，選用功能）**：
  - 若您選擇使用 Groq Whisper AI 產生動態歌詞時間碼，您所輸入的 Groq API Key 沒有內建預設值；輸入後僅保存於本機 `chrome.storage.local`，可在歌詞頁清除，絕不會寫入開發者伺服器。
  - 當您主動點擊「產生」並勾選同意後，音訊片段才會透過 HTTPS 直接傳送至 Groq 官方 API 進行語音辨識；辨識完成後僅取回時間碼文字，我們不會保留或轉發該音訊。

### 2. 瀏覽器權限使用說明 (Permissions Justification)
本擴充功能僅向 Chrome 申請提供歌唱練習功能所不可或缺的最小權限：

| 權限項目 | 使用目的與必要性 |
| :--- | :--- |
| `tabCapture` | 用於在使用者點擊啟動後，即時擷取目前分頁的音訊串流，以進行 AudioWorklet 移調（十二平均律升降 Key）、共振峰修正與變速處理。 |
| `offscreen` | 依據 Chrome Manifest V3 安全架構規範，在獨立的背景 AudioContext 執行低延遲數位訊號處理（DSP）與音訊運算。 |
| `storage` | 於使用者本機儲存練唱歌單、最近播放紀錄、歌詞偏好設定與介面自訂項目。 |
| `identity` / `identity.email` | 用於識別您目前登入 Chrome 的 Google 帳號 Email，以便提供選用的 Chrome Sync 跨裝置歌單同步功能。 |
| `scripting` / `activeTab` | 當使用者在 YouTube 分頁主動開啟擴充功能時，於影片畫面上掛載 Shadow DOM 雙行 KTV 歌詞浮動字幕。 |
| `host_permissions` (`*://*.youtube.com/*`) | 用於在 YouTube 與 YouTube Music 網頁上偵測播放狀態、控制時間軸跳轉與呈現歌詞。 |
| `optional_host_permissions` (`https://api.groq.com/*`) | 僅在使用者啟用 AI 歌詞功能時，經使用者授權後連線至 Groq API 進行語音辨識。 |

### 3. 資料分享與第三方服務
- **絕不轉售資料**：我們不會將您的任何個人資料、使用習慣或音訊資料販售或提供給廣告商、資料經紀商或第三方機構。
- **無追蹤與無廣告**：本擴充功能無任何第三方追蹤代碼（如 Google Analytics、Facebook Pixel 等），亦無任何橫幅或插入式廣告。
- **第三方 API（Groq）**：使用 AI 歌詞功能時，音訊將直接傳送至 Groq（遵循 Groq 隱私與服務條款），不經過任何中繼代理伺服器。

### 4. 資料儲存與刪除
所有儲存於您電腦上的歌單、歷史紀錄與歌詞資料，均可透過擴充功能介面中的「清除」或「刪除歌單」隨時移除。當您自 Chrome 移除本擴充功能時，所有儲存於 `chrome.storage.local` 的資料將一併被瀏覽器自動完整清除。

### 5. 聯絡我們
若您對本隱私權政策或擴充功能有任何疑問、建議或問題回報，歡迎透過以下方式與開發團隊聯繫：
- **開發者 GitHub / 專案頁面**：https://github.com/
- **聯絡 Email**：support@diaochang.app (或您的開發者電子郵件)

---

## English Version

### 1. What Data We Collect
Diaochang uses a **Local-First architecture** with no developer-owned backend database. We do not collect, store, or sell your personal information, browsing history, or audio on developer servers; optional Groq AI lyrics send audio directly to Groq only after explicit consent.

- **Practice Settings & Playlists**: Your playlists, song URLs, pitch adjustments (semitones/cents), playback speed, A-B loop points, and lyrics are stored locally within your browser using `chrome.storage.local`.
- **Chrome Sync (Optional)**: If you choose to enable Google Account sync, your playlist and lyrics configuration are synchronized via Chrome's native `chrome.storage.sync` API. We never access your credentials or sensitive account data.
- **AI Lyrics Transcription (BYOK, Optional)**:
  - If you use Groq Whisper AI to generate timed lyrics, there is no bundled default key. A key entered for personal testing is stored only in the extension's local storage, can be cleared from the lyrics view, and is never written to a developer server.
  - Audio is sent directly to Groq's official API over HTTPS only after your explicit consent and initiation.

### 2. Permission Justifications
We adhere to Google's principle of least privilege, requesting only what is strictly required for core functionality:

- `tabCapture`: To capture active tab audio in real-time for pitch-shifting and tempo alteration via AudioWorklet.
- `offscreen`: To process low-latency Web Audio API / DSP pipelines in a dedicated background offscreen document as required by Manifest V3.
- `storage`: To store practice presets, playlists, and lyrics locally on your device.
- `identity` & `identity.email`: To identify your active Chrome sync profile for cross-device playlist restoration.
- `scripting` & `activeTab`: To render the KTV lyrics overlay inside an isolated Shadow DOM on YouTube video players.
- `host_permissions` (`*://*.youtube.com/*`): To control media playback, seek timestamps, and overlay lyrics on YouTube pages.
- `optional_host_permissions` (`https://api.groq.com/*`): Requested on-demand only when using the optional Groq AI transcription feature.

### 3. Data Protection & Non-Disclosure
- **No Data Sale**: We do not sell or monetize user data.
- **No Ads or Trackers**: No third-party tracking scripts or advertisements are bundled.
- **Data Deletion**: Uninstalling the extension immediately deletes all local storage data associated with the extension.

### 4. Contact
For any questions regarding privacy, please contact the developer via GitHub or email.
