# Karaoke Kaiju 隱私權政策 / Privacy Policy

> 0.1.0 公開測試版；最近更新：2026 年 8 月 21 日

Karaoke Kaiju 是用於 YouTube 與 YouTube Music 歌唱練習的 Chrome 擴充功能。本政策描述 0.1.0 公開建置實際開放的功能與權限。

## 繁體中文

### 資料處理原則

- 我們沒有開發者自有帳號系統、後端資料庫、廣告或第三方追蹤程式。
- 即時移調、音高微調與其他核心音訊處理在使用者裝置上的 Web Audio 管線執行。
- 歌單、歌曲 URL、Key、cents、速度、A–B、最近播放、歌詞與介面偏好預設儲存在 `chrome.storage.local`。
- 使用者主動開啟 Google 帳號同步時，歌單與歌詞會經由 Chrome 內建的 `chrome.storage.sync` 保存到目前的 Chrome Sync 帳號。我們無法取得 Google 密碼，資料也不會經過開發者伺服器。
- 0.1.0 公開版不連線外部 AI 服務，也不要求 Groq 或 Google Drive API 網域權限。

### 權限用途

| 權限 | 用途 |
| --- | --- |
| `activeTab`、`scripting` | 使用者主動開啟工具後，偵測目前分頁媒體並顯示隔離的 KTV 歌詞介面。 |
| `tabCapture` | 使用者點擊圖示後擷取目前分頁音訊，提供即時移調。 |
| `offscreen` | 依 Manifest V3 規範，在背景文件執行 AudioContext 與 DSP。 |
| `sidePanel` | 顯示固定的練唱控制面板。 |
| `storage`、`unlimitedStorage` | 保存歌單、歌詞、練唱設定與較大的本機時間碼資料。 |
| `identity`、`identity.email` | 確認目前 Chrome 個人檔案的登入狀態，讓使用者選擇是否啟用 Chrome Sync。 |
| YouTube／YouTube Music 網域 | 讀取媒體狀態、控制播放位置並在支援頁面顯示歌詞。 |

### 分享、保留與刪除

我們不販售或提供個人資料給廣告商或資料經紀商。使用者可在擴充功能內刪除歌單、歌詞與最近紀錄；移除擴充功能時，Chrome 會清除其本機資料。Chrome Sync 內容依使用者的 Chrome／Google 帳號同步設定與 Google 政策管理。

## English

Karaoke Kaiju 0.1.0 has no developer-operated account system, backend database, advertising, or third-party analytics. Core pitch and playback processing runs on the user's device. Practice presets, playlists, song URLs, lyrics, history, and preferences are stored in `chrome.storage.local`.

If the user explicitly enables Google Account sync, playlists and lyrics use Chrome's native `chrome.storage.sync` service for the currently signed-in Chrome profile. The developer cannot access the user's Google password, and the data does not pass through a developer server.

The 0.1.0 public build does not connect to external AI services and does not request Groq or Google Drive API origins. Browser permissions are used only for active-tab media control, tab audio capture, background Web Audio processing, the side panel, local/sync storage, Chrome profile status, and supported YouTube page integration.

We do not sell user data. Users can delete playlists, lyrics, and recent history from the extension. Removing the extension causes Chrome to remove its local extension data; synchronized data follows the user's Chrome Sync and Google account settings.

Questions and reports: [GitHub Issues](https://github.com/VirginBear/Karaoke-Kaiju/issues)
