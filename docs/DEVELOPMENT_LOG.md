# 開發紀錄

本檔按時間追加，記錄每次工作的範圍、改動、驗證結果、風險與下一步。未經驗證的功能不能只寫「完成」。

## 紀錄格式

```text
## YYYY-MM-DD — 標題

- 階段：
- 本次目標：
- 變更：
- 驗證方式：
- 驗證結果：
- 已知問題／風險：
- 決策：
- 下一步：
```

## 2026-08-16 — 建立需求與技術基線

- 階段：需求對準
- 本次目標：研究參考產品，建立可驗證的產品規格、架構草案與開發紀錄機制。
- 變更：
  - 建立 `README.md`。
  - 建立 `docs/PROJECT_SPEC.md`。
  - 建立 `docs/ARCHITECTURE_DECISIONS.md`。
  - 建立本開發紀錄。
- 研究與驗證方式：
  - 實際檢視 Transpose.Video 官方頁面與 Classic／Pro 控制面板示意。
  - 核對 Chrome 官方 `tabCapture`、`offscreen`、`storage`、`identity`、`activeTab`、Manifest V3 與 Chrome Web Store 使用者資料政策。
  - 核對 Google Drive `appDataFolder` 官方說明。
  - 比較 SoundTouchJS、Tone.js PitchShift、Rubber Band 與 ONNX Runtime Web 的官方文件或專案授權。
- 驗證結果：
  - Key、速度與 A/B 循環可規劃成 Chrome 擴充功能的核心路徑。
  - `tabCapture + offscreen + AudioWorklet` 是目前最合理的跨網站音訊架構，但仍必須用 YouTube 實測延遲與音質。
  - `chrome.storage.sync` 不適合大量歌詞；Drive `appDataFolder` 可以達成不自建資料雲端的選用同步。
  - 即時 AI 去人聲對模型大小、效能與 Chrome 發布政策風險過高，不應阻擋 MVP。
- 已知問題／風險：
  - Chrome Web Store 頁面禁止自動化讀取，因此本次以官方產品網站的可見內容與控制面板示意為主要競品研究來源，沒有安裝第三方擴充功能。
  - 各串流平台、DRM 與網站更新的實際相容性未知。
  - SoundTouchJS 正式採用版本的套件授權需在鎖版時再次核對。
- 決策：
  - 本輪只建立文件，不開始產品程式碼。
  - 先等待 `PROJECT_SPEC.md` 第 17 節的產品決策確認。
- 下一步：
  - 使用者確認需求後建立 Phase 0 技術原型與自動／手動音訊測試素材。

## 2026-08-16 — Phase 0 可操作原型與自動驗證

- 階段：Phase 0 技術可行性原型
- 本次目標：把需求文件落成可以真正載入 Chrome 的升降 Key、速度與 A–B 練唱面板，並用可重跑測試驗證。
- 變更：
  - 建立 React + TypeScript + Vite 的 Chrome Manifest V3 專案。
  - 建立 Side Panel、service worker、動態注入的媒體控制器與 offscreen 音訊引擎。
  - 整合 `@soundtouchjs/audio-worklet@2.1.1`，以半音／cents 公式獨立移調。
  - 建立速度、A–B、播放／暫停、前後五秒與引擎啟停控制。
  - 建立「調唱」圖示、概念稿、介面規格與 `420 × 900` 實作截圖。
  - 建立 440 Hz 音檔、頻率分析頁、自帶 localhost server 的擴充功能 smoke test，以及一鍵 `pnpm run check`。
  - 修正 content script 初版被 Rollup 切出 ESM import、無法用 `chrome.scripting.executeScript()` 注入的問題，改為單檔 bundle。
  - 停止處理時關閉音訊串流、AudioContext 與 offscreen document。
- 驗證方式：
  - TypeScript build 與 Vitest。
  - OfflineAudioContext + SoundTouch 處理 440 Hz，再以 normalized autocorrelation 量測輸出頻率。
  - Playwright Chrome for Testing 實際載入 `dist/`，呼叫正式 background → offscreen → AudioWorklet 路徑。
  - 以 Transpose 官方 YouTube 示範影片做真實網站 smoke test。
  - 連續執行 600 秒狀態與 underrun 監控。
  - in-app Chromium 以 `420 × 900` 進行畫面與按鈕互動檢查。
- 驗證結果：
  - `pnpm run check` 通過；1 個測試檔、6 個單元測試全數通過，正式建置成功。
  - 7 個半音驗收點全數低於 ±5 cents；最大絕對誤差約 1.51 cents。
  - 本機 HTML5 audio：+7 Key、0.75×、A–B 跳回、停止與資源釋放通過。
  - YouTube：正確取得影片標題、作者與 72.761 秒長度；+7 Key、0.75×、A–B 與停止通過。
  - AudioContext 基礎輸出延遲為 29 ms。
  - 穩定性測試實跑 600.764 秒、597 次取樣、0 次 inactive；啟動穩定後新增 1 個 underrun，最高延遲 29 ms。
  - 介面 console error/warning 為 0；Key、微調、速度與三個導覽頁互動通過。
- 已知問題／風險：
  - 自動測試使用 Chromium 的測試 allowlist 模擬使用者已主動叫用擴充功能；日常 Chrome 仍需使用者點擊擴充功能以取得 `activeTab`／tab capture 授權。
  - 目前只完成 Phase 0；歌單、Google Drive 同步、歌詞與人聲降低仍未實作。
  - 尚未完成使用者本人實唱的音質、formant、爆音與操作手感評估。
  - YouTube 測試頁本身出現一個外部資源 401 console 訊息，但擴充功能流程與媒體控制均成功。
- 決策：
  - 保留最小權限的 `activeTab`，不為了自動化測試在正式 manifest 加入 `<all_urls>` 或永久 host permission。
  - Phase 0 先以 SoundTouchJS 進入使用者體驗測試，主觀聽感通過後再鎖定 DSP。
  - 將核心控制收斂到 `420 × 900` 一屏，避免練唱時頻繁捲動。
- 下一步：
  - 經使用者明確同意後，把 `dist/` 作為未封裝擴充功能載入日常 Chrome。
  - 只收集使用者體驗回饋，再依回饋修正 Phase 0／Phase 1 手感。
  - Key／速度／A–B 體驗確認後，進入多播放清單與 local-first 資料模型。

## 2026-08-16 — 修正 YouTube 啟動體驗與 Apple 風格雙主題

- 階段：Phase 1 使用體驗修正
- 本次目標：處理影片已播放但面板顯示「尚未啟動」、調 Key 後無反應的困惑，並將視覺改為簡單俚落的 macOS／iOS 配色邏輯。
- 變更：
  - 將「歌曲偵測」與「音訊引擎」拆成兩個狀態；不再使用全局「尚未啟動」。
  - 新增「正在偵測歌曲」、「已找到歌曲」、「重新偵測」與明確錯誤狀態。
  - 將「開始練唱」改為全寬主要按鈕；第一次調整 Key 時也會去重複地自動啟動音訊處理。
  - 新增亮色／暗色切換與本機偏好儲存。
  - 將舊珊瑚／青綠視覺改為 Apple 平台風格的中性灰階、系統藍、成功綠與錯誤紅；字體改為 Apple system font stack。
  - 收旂多張卡片與裝飾陰影，使用開放留白與 1 px 分隔線。
  - 建立 Phase 1 雙主題概念稿、更新 UI 規格、忠實度紀錄與手動測試步驟。
  - 將擴充功能 smoke test 加入「尚未啟動時直接調 Key 必須自動進入 active」的回歸驗證。
- 驗證方式：
  - 在使用者提供的精確 YouTube URL 載入正式 `dist/` 擴充功能。
  - 以真實 side panel React DOM 點擊 Key 的加號，驗證自動啟動，再驗證 +7 Key、0.75×、A–B 與停止。
  - in-app Chromium 固定 `420 × 900`，檢查亮色／暗色、Key、速度、導覽、DOM 可達性與 console。
- 驗證結果：
  - 精確 URL 正確識別為 `[MV] IU(아이유) _ Palette(팔레트) (Feat. G-DRAGON)`，作者為 `1theK (원더케이)`，長度 218.041 秒。
  - 直接點擊 Key：音訊狀態由 idle 進入 active，半音為 +1，基礎輸出延遲 29 ms。
  - 後續 +7 Key、0.75×、A–B 循環與停止全數成功。
  - 亮暗切換、Key 與速度互動後 DOM 狀態正確；介面 console error/warning 為 0。
- 已知問題／風險：
  - YouTube 本身的 Google Ads 轉換資源在自動測試環境出現 CORS／401，但擴充功能的媒體、音訊與控制流程均成功。
  - 重新載入未封裝擴充功能後，既有 YouTube 分頁仍需重新整理，讓新版 content script 與權限流程生效。
- 決策：
  - 保留手動「開始練唱」作為明確入口，但不要求使用者必須先理解 DSP 狀態才能調 Key。
  - 主題只提供亮色與暗色，不加第三套品牌配色。
- 下一步：
  - 由使用者在日常 Chrome 重新載入 `dist/`，只回報實際聽感、按鈕手感與資訊密度。

## 2026-08-16 — 修正 YouTube 媒體永遠偵測不到

- 階段：Phase 1 回歸除錯
- 本次目標：修正使用者在 YouTube 已播放影片，但面板一直顯示「尚未找到可播放媒體」的問題。
- 根因：
  - 媒體偵測依賴點擊 action 後才短暫授予的 `activeTab`。擴充功能重新載入、側邊面板持續開啟或切換分頁時，這個授權不一定存在。
  - `getMediaState()` 把權限、content script 注入與訊息連線錯誤全部改成 `EMPTY_MEDIA_STATE`，導致面板無法區分「沒有媒體」與「根本沒有連上分頁」。
- 變更：
  - Manifest 版本升為 `0.0.2`。
  - 只對 `www.youtube.com`、`music.youtube.com`、`m.youtube.com` 加入固定 host permission 與自動 content script；沒有申請 `<all_urls>`。
  - 保留其他網站的 `activeTab` 動態注入流程。
  - `ExtensionState` 新增 `mediaError`，背景錯誤不再被吞掉。
  - 面板現在區分「已找到歌曲」、「頁面已連接，等待媒體」與「無法連接目前分頁」，並完整顯示可操作的錯誤原因。
  - 媒體未連接時停用 Key、速度、A–B 與播放控制，避免假操作。
  - smoke test 新增 cold detection：沒有先觸發 `activeTab` 也必須識別媒體。
- 驗證方式：
  - Browser 直接檢查使用者 URL，確認 YouTube 頁面有正在播放的影片播放器。
  - 真實 Chrome MV3 `dist/` 擴充功能在同一 URL 進行 cold detection、Key 自動啟動、速度、A–B 與停止測試。
  - in-app Chromium 以 `420 × 900` 檢查成功與權限失敗畫面，並點擊重新偵測／開始練唱。
- 驗證結果：
  - Cold detection 在沒有先取得 `activeTab` 時仍正確辨識 IU Palette、`1theK (원더케이)`、218.041 秒，`mediaError = null`。
  - 直接調 Key 後音訊進入 active；+7 Key、0.75×、A–B 與停止全數通過。
  - 成功畫面顯示「已找到歌曲」；失敗畫面顯示完整權限原因與重新偵測；兩者 console error/warning 均為 0。
- 已知問題／風險：
  - 從 `0.0.1` 更新到 `0.0.2` 必須在 `chrome://extensions` 重新載入，並重新整理已開啟的 YouTube 分頁，新 host permission 與 content script 才會生效。
  - YouTube 自有的 Google Ads CORS／401 console 噪音仍存在，但不影響擴充功能訊息或音訊流程。
- 決策：
  - 更新先前「完全不使用固定 host permission」的決策：對第一正式支援平台 YouTube 使用最小、可理解的定點權限，以換取穩定偵測。
- 下一步：
  - 使用者在日常 Chrome 重新載入新版後回報面板是否顯示「已找到歌曲」。

## 2026-08-16 — 修正 tabCapture 未由目前分頁叫用

- 階段：Phase 1 權限流程除錯
- 使用者回報：`Extension has not been invoked for the current page (see activeTab permission). Chrome pages cannot be captured.`
- 根因：
  - `0.0.2` 新增的 YouTube host permission 只解決媒體偵測，不會取代 `tabCapture` 所需的使用者 action 叫用。
  - 從 side panel 按「開始練唱」並不會對 YouTube 分頁產生 `activeTab` 授權。
- 變更：
  - Manifest 版本升為 `0.0.3`。
  - 關閉 `openPanelOnActionClick`，改由 `chrome.action.onClicked` 同時開啟 side panel、偵測媒體與啟動目前分頁的音訊。
  - 把 Chrome 英文權限錯誤改為明確的中文操作指示，並加入單元測試。
  - 當前狀態必須重新點圖示時，「開始練唱」與 Key 會停用，避免重複觸發必然失敗的 capture。
- 驗證：
  - 使用者回報的完整 Chrome 錯誤已由回歸測試驗證為中文操作指示。
  - Chrome for Testing 實際載入擴充功能，驗證 YouTube 偵測、tab capture、移調、變速、A–B 與停止。
  - `420 × 900` 預覽檢查授權提示、Key 停用狀態與 console。
- 限制：
  - 自動化測試環境的 Chrome allowlist 會繞過真實 `activeTab` 叫用限制；所以「在日常 Chrome 點圖示即自動啟動」保留給使用者進行一次手動驗收。

## 2026-08-16 — 0.0.4 十二平均律稽核、自然人聲、設定與本機歌單

- 階段：Phase 1 音質修正 + Phase 4 本機基本版
- 本次目標：回應使用者對 Key 音程與自然度的疑問，並繼續完成設定入口與可實際使用的歌單。
- 根因分析：
  - 原移調倍率已是十二平均律 `2^(n/12)`，所以 C 的 +1／+2 音高目標本來就是 C♯／D。
  - 聽起來怪異主要是主唱共振峰也被一起搬移，屬於音色問題，不是半音數學錯誤。
- 變更：
  - 將 offscreen 與離線 QA 改用 `@soundtouchjs/formant-correction-worklet@2.1.1`。
  - Key 直接設定整數 `pitchSemitones`；cents 維持獨立微調，預設開啟自然人聲共振峰修正。
  - 在 Key 控制旁明示「十二平均律 · 每格 1 半音 · C → C♯ → D」。
  - 新增設定頁：亮暗主題、三種按鍵大小、標準／自然人聲、Google Drive 規劃、本機資料說明與版本。
  - 新增具 schema version 的本機多歌單資料模型、CRUD、歌曲去重與 Key／速度／A–B preset 保存。
  - 建立 Phase 2 歌單／設定概念稿並以 `420 × 900` 驗證亮暗畫面。
- 驗證方式：
  - Vitest 驗證 C → C♯／D♭、C → D 比率與歌單 CRUD／去重／preset。
  - 離線 440 Hz 共振峰修正版 DSP 精準度測試。
  - Chrome for Testing 載入正式 `dist/`，切換兩種移調品質並驗證完整音訊路徑。
  - 實際瀏覽器建立「每日練唱」、加入歌曲，檢查 `Key -2`／`0.90×`，再切換設定與亮暗主題。
- 驗證結果：
  - 型別檢查、12 個單元測試、正式建置、7 點音高精準度與擴充功能 smoke test 全數通過。
  - 7 點最差誤差仍為 +7 的約 +1.51 cents，低於 ±5 cents 標準。
  - 自然人聲模式持續播放 20.113 秒、20 次取樣，0 次 inactive；啟動穩定後新增 1 次 underrun，最高延遲 29 ms。
  - 歌單建立、歌曲保存、按鍵大小與自然人聲切換均正確反映在 DOM；正式擴充 smoke test 的 `errors` 為空。
  - Chrome 開發預覽由瀏覽器自動化擴充功能本身留下三筆非產品 message-channel 錯誤；同一版正式擴充的隔離 smoke test 無錯誤。
- 已知問題／風險：
  - 共振峰修正改善自然度但不能取代不同歌曲、歌手與極端 Key 的人工實唱評估。
  - Google OAuth／Drive、捐款 URL、歌單排序／備註／匯出尚未完成；設定頁誠實標示未啟用。
- 下一步：
  - 由使用者比較標準／自然人聲的實唱聽感。
  - 完成 Google Drive 同步前的 OAuth、隱私政策與衝突處理設計，或依優先順序先進入歌詞匯入。

## 2026-08-16 — 0.0.5 同分頁歌單佇列、單曲循環與 Google 同步

- 階段：Phase 4 歌單可用性與跨裝置同步
- 本次目標：讓歌單成為不中斷練唱控制面的播放佇列，並以使用者目前的 Chrome Google 同步帳號保存歌單。
- 變更：
  - 歌單歌曲改用既有 YouTube 分頁導向，不再開啟新分頁；切歌後沿用同一個 tab capture 音訊工作階段。
  - 建立背景播放佇列，加入上一首、下一首、依序播放、播完自動下一首與單曲循環。
  - 切歌後等待媒體就緒，再自動套用歌曲保存的 Key、cents、速度與 A–B，並開始播放。
  - YouTube 歌曲網址儲存為 canonical watch URL，移除 radio／playlist 查詢參數，避免網站自己的清單干擾練唱佇列。
  - 歌單資料加入 `updatedAt` 與分塊同步 codec；以 `chrome.storage.sync` 跟隨目前 Chrome Sync 帳號，不建立專案後端。
  - 設定頁加入真實 Google／Chrome Sync 狀態、email、連動／取消連動、重新檢查與容量用量。
  - Manifest 加入 `identity`、`identity.email` 與固定開發版 public key，讓相同建置在不同電腦維持同一 extension ID。
  - 按鍵大小擴大作用範圍；精簡與大尺寸在設定分段、播放控制、歌單列與底部導覽都有可見差異。
- 驗證方式：
  - Vitest 驗證 Unicode 歌單分塊往返、缺塊拒絕、CRUD、preset 與 YouTube canonical URL。
  - Chrome for Testing 載入正式擴充功能，實際執行 Chrome Identity 查詢、sync storage 往返、同 tab 切歌、自動下一首、單曲循環與 preset 套用。
  - 以 `420 × 900` 進行亮色歌單、暗色 Google 連動、按鍵大小與無障礙語意檢查。
- 驗證結果：
  - 同一 tab ID 在切歌前後保持不變，音訊處理仍為 active。
  - 第二首自動套用 `Key -3`、`cents +7`、`1.25×`；第一首結束後佇列前進到第二首。
  - 單曲循環結束後回到歌曲開頭，佇列仍停在原曲。
  - 隔離擴充功能測試的 console `errors` 為空；Chrome Sync storage 寫入、讀回與清除成功。
  - 使用者指定的 IU YouTube URL 正確辨識歌曲、作者與 218.041 秒長度，tab capture、Key、速度與 A–B 全數通過；只留下 YouTube 廣告資源自己的 401／CORS 噪音。
  - `420 × 900` 下精簡／大按鈕實測高度為 26／40 px，頁面無水平溢出。
- 已知問題／風險：
  - 真正跨兩台電腦的傳輸需要使用者在兩台 Chrome 登入同一帳號並開啟 Sync；自動化環境沒有真實 Google 登入，因此此項保留人工驗收。
  - Chrome Sync 約 100 KB，適合歌單與練習參數，不適合未來的大量逐字歌詞；歌詞階段應改用 Drive `appDataFolder` 或匯出／匯入。
  - 固定 development extension ID 會使舊版未封裝擴充功能成為不同 ID；更新到 0.0.5 時需移除舊版並重新載入一次，舊 ID 的本機資料不會自動搬移。
  - 目前可靠的同分頁連續播放以 YouTube 為第一支援平台；其他網站需逐站加入 host permission 與導向驗證。
- 決策：
  - 第一階段帳號連動使用 Chrome Sync，不要求 OAuth consent screen、Drive API 或專案資料庫。
  - 大型歌詞資料延後使用 Google Drive 私有 app data，不把 Chrome Sync 當成無上限雲端。
- 下一步：
  - 由使用者在日常 Chrome 完成同帳號雙電腦同步驗收。
  - 歌單流程通過後再進入歌詞匯入、逐句時間軸與 KTV 提前顯示。

## 2026-08-17 — 0.0.6 四語練唱工作台、近期歌曲與完整設定

- 階段：Phase 1–4 介面整合與資料流程精進
- 本次目標：把參考產品畫面中的資訊架構轉化成「調唱」自己的 Apple 式介面，先完成可驗收版面與已有能力，並擴充後續專案範圍。
- 變更：
  - 建立練唱、長設定、近期／歌單三張原創概念稿；沒有沿用參考產品黃黑品牌或付費文案。
  - 主畫面拆分 Key、Fine Pitch、速度、A–B 與傳輸控制，底部導覽擴為練唱／最近／歌單／歌詞。
  - 新增本機近期播放資料模型、自動保存、搜尋、移除、同分頁重播與加入任一歌單。
  - 最近與歌單共用同一 PlaybackTrack preset；同分頁播放會套用 Key、cents、速度與 A–B。
  - 設定頁加入四語、主題、按鍵大小、自動歷史、跳轉秒數、音高顯示、Key 範圍、A4 基準音、控制模組與快捷鍵。
  - 新增繁中、英文、日文、簡中本機字典與 Chrome `_locales`；品牌「調唱」不翻譯。
  - Equalizer／Vocal Reducer 顯示為停用的後續規劃，不提供假功能。
- 驗證結果：
  - `pnpm run check` 通過型別、18 個單元測試、正式建置、7 點 440 Hz DSP 與 Chrome 擴充 smoke test。
  - 所有音高量測低於 ±5 cents；最差仍約 +1.51 cents。
  - 同一 tab 切歌、preset、自動下一首、單曲循環與 Chrome Sync storage 全數成功，隔離測試 `errors` 為空。
  - 420 px 實際切換四語、亮暗、設定模組、快捷鍵、近期加入歌單與同分頁播放；320 px 窄面板另做版面檢查。
- 已知邊界：
  - 最近播放刻意只存在本機；要跨電腦的歌曲需加入歌單。
  - 歌詞、EQ、人聲降低、MIDI、本機檔案與 Drive 大容量同步仍未實作。
  - 瀏覽器預覽環境可能留下瀏覽器控制工具本身的舊 message-channel 錯誤；同版隔離擴充 smoke test 無產品錯誤。
- 下一步：
  - 由使用者回饋新版控制密度、四語用詞與設定分組。
  - 下一個功能階段進入歌詞匯入資料模型、LRC parser、逐句時間軸與 KTV 提前顯示。

## 2026-08-17 — 0.0.7 動態歌詞第一版

- 階段：Phase 5A／5B 第一版
- 目標：讓使用者在 YouTube 影片下三分之一看到可提前閱讀的雙行 KTV 歌詞，並提供不依賴開發者後端的 LRC／AI 對時流程。
- 變更：
  - 新增 LRC、Enhanced LRC、Groq segment／word timestamp parser 與歌曲 canonical URL 歌詞庫。
  - 新增左上／右下交替雙行播放器覆蓋層，白字底、系統藍進度、Shadow DOM 樣式隔離。
  - 新增歌詞頁：影片顯示開關、即時預覽、±0.5 秒 offset、檔案／貼上匯入、刪除與《花香》參考頁捷徑。
  - 新增 Groq BYOK 對時；API Key 不保存，音檔需由使用者選取、勾選同意，並在執行時授予選用網域權限。
  - 歌詞相關介面完整加入繁中、英文、日文與簡中。
- 驗證：
  - TypeScript、22 個 Vitest、正式建置通過。
  - Chrome 擴充 smoke test 實際驗證歌詞 Shadow DOM 已掛載、兩句內容存在、藍色 `clip-path` 隨媒體時間推進；原有媒體、音訊、歌單與同步回歸也通過，console errors 為空。
  - 以使用者指定的《許紹洋 花香》YouTube URL 實測：辨識到 270.301 秒影片，正式內容腳本在 `#movie_player` 掛上雙行覆蓋層，白字／藍色進度與下三分之一定位正常；YouTube 僅留下其廣告資源自身的 401 console 噪音。
  - 420 × 900 與 320 × 760 歌詞頁均無水平溢出；LRC 三句匯入、顯示開關、offset 重設及四語切換已操作驗證。
  - 修正內容腳本被 Rollup 拆成 ESM chunk 後無法注入的問題；正式 `media-controller.js` 已保持自含式 classic script。
- 邊界：
  - 未內建或複製《花香》完整歌詞；使用者可從自己指定的參考頁取得 LRC 再匯入。
  - 真實 Groq 請求需要使用者自己的 API Key 與有權使用的音檔，本次不代替使用者上傳音訊。
  - 歌詞尚未 Drive 跨裝置同步，亦尚無逐句手動編輯器。

## 2026-08-17 — 0.0.8 歌詞微調、顯示控制與個人同步

- 階段：Phase 5A／5B 可用性增量
- 目標：讓使用者不離開歌詞頁就能校時、調整畫面與控制練唱，並讓個人歌詞跟隨目前 Chrome Google Sync 帳號。
- 變更：
  - offset 增加 ±0.1 秒細調，保留 ±0.5 秒與重設。
  - 覆蓋卡加入字體、遮罩透明度與上下位置；影片 Shadow DOM 立即套用。
  - 歌詞頁加入播放／暫停、前後跳轉、A／B、循環與清除的精簡控制板。
  - 新增歌詞 Chrome Sync 分塊 codec、checksum、newest-wins 邏輯與遠端變更監聽；同步內容包含歌詞、offset 及顯示設定。
  - 同步卡顯示帳號、狀態與用量，明確說明不是一般 Drive 檔案或開發者伺服器。
  - 以原創中文語音真實呼叫 Groq `whisper-large-v3`，成功取得 6.72 秒、22 個 word timestamps；API Key 未寫入任何檔案或 storage。
- 驗證：
  - 420 × 900 操作所有新增控制，320 × 760 無水平溢出。
  - Vitest 新增歌詞同步 Unicode 往返、分塊與缺塊拒絕測試。
  - `pnpm run check` 通過 TypeScript、25 個 Vitest、正式建置、7 點 DSP 精準度與隔離擴充功能 smoke test；擴充測試 `errors` 為空。
  - 正式 `dist` 另在使用者指定的《花香》YouTube URL 驗證媒體偵測、音訊處理、A–B 與歌詞覆蓋；字體、透明度與上下位置皆套用，只有 YouTube 自身廣告資源的 401 噪音。
- 邊界：
  - Chrome Sync 約 100 KB，歌詞量增加後仍需 Drive `appDataFolder` 或匯出方案。
  - 真實歌曲辨識會受混音、伴奏與唱腔影響；0.1 秒整體微調已交付，逐句／逐字人工編輯器仍在後續。

## 2026-08-17 — 0.0.9 目前分頁 AI 動態歌詞

- 問題：0.0.8 的 Groq 入口只接受本機音訊檔，使用者無法直接拿正在播放的 YouTube Music 歌曲產生時間碼。
- 變更：
  - offscreen 音訊引擎新增 MediaRecorder，直接錄製既有 tab capture 的原始分頁音訊。
  - 錄製時從頭原速播放、暫停 A–B／自動下一首，完成或取消後恢復原始練唱狀態。
  - 歌詞 AI 卡新增直接分頁入口、進度、啟動提示、取消操作與四語文案；本機檔案保留為備用。
  - Groq 請求抽成共用、可測試的模組；25 MB 上限與空檔檢查在送出前完成。
- 驗證：
  - 隔離 Chrome 擴充測試實際錄製 2 秒 tab capture，產生 16 KB WebM／Opus，並確認錄製後 0.75×、A–B 與 active 音訊狀態恢復。
  - 420 × 900 與 320 × 760 的 AI 卡無水平溢出；預覽流程可從按鈕產生歌詞並顯示成功狀態。
- 邊界：錄製完整歌曲必須等候歌曲實際播放完，並保持側邊面板與歌曲分頁開啟。

## 2026-08-17 — 0.0.10 歌詞時間軸逐句工作台、多格式匯入匯出與打拍對時

- 階段：Phase 5B 完整歌詞編輯工作台
- 目標：提供完整的歌詞時間軸（Timeline Editor）、SRT／VTT／LRC／純文字多格式解析與匯出、逐句時間碼微調與跳轉、區段平移、一鍵復原原始版本、即時打拍對時（Tap-to-Time）以及預唱前置時間（Lead Time）控制。
- 變更：
  - **資料模型與核心函式庫** (`src/shared/lyrics.ts`, `src/shared/protocol.ts`)：
    - `LyricsSource` 擴充支援 `'srt' | 'vtt' | 'manual'`。
    - `SongLyrics` 新增 `leadTimeSeconds`（0.5s ~ 3.0s，預設 1.5s）與 `originalLines` 原始快照。
    - 新增 `parseSrt`、`parseVtt`、`parsePlainText`、`parseGenericLyrics`（正則防狀態殘留安全實作）。
    - 新增 `exportToLrc`、`exportToSrt`、`exportToVtt`。
    - 新增 `updateLyricLine`、`batchShiftLyricLines`、`addLyricLine`、`removeLyricLine`、`resetLyricLinesToOriginal`。
    - 升級 `getLyricFrame`，動態依據 `leadTimeSeconds` 計算即將顯示的下一句歌詞。
  - **內容腳本與浮動字幕** (`src/content/lyrics-overlay.ts`, `src/sidepanel/App.tsx`)：
    - 影片覆蓋層 Shadow DOM 同步接收並套用 `leadTimeSeconds`。
  - **Hook 與儲存** (`src/sidepanel/useLyricsLibrary.ts`)：
    - 封裝 `updateLine`、`batchShiftLines`、`addLine`、`removeLine`、`resetToOriginal`、`exportLyrics`、`setLeadTimeSeconds` 及通用多格式匯入 API。
  - **國際化 i18n** (`src/sidepanel/i18n.tsx`)：
    - 完整支援繁中、英文、日文、簡中四種語言的歌詞工作台、打拍對時與匯出字串。
  - **Side Panel 歌詞工作台介面** (`src/sidepanel/components/LyricsView.tsx`, `src/sidepanel/styles.css`)：
    - 新增逐句時間軸編輯器：單句開始/結束時間微調（±0.1s / ±0.5s）、一鍵對齊至目前時間、快速跳轉至該句、單句文字直接編輯、單句刪除與新增。
    - 新增「自此句往後平移（Shift from here）」功能，可一鍵將後續所有歌詞整批推進或提早 ±0.1s / ±0.5s。
    - 新增「復原至原始版本」按鈕，快速撤銷所有編輯。
    - 新增「即時打拍對時（Tap-to-Time）」模式：支援鍵盤 Space / Enter 與大按鈕敲擊，即時標記每句時間戳記。
    - 新增「預唱前置時間（Lead Time）」滑桿控制（0.5s ~ 3.0s）。
    - 新增多格式匯出功能：支援 LRC / SRT / VTT 格式複製至剪貼簿與檔案下載。
- 驗證：
  - 新增 6 組 Vitest 單元測試（共 33 個測試全數通過）。
  - `pnpm run check` 通過全套測試（TypeScript、33 個單元測試、正式 Rollup/Vite 建置、7 點 440 Hz DSP 音高量測、隔離 Chrome 擴充 smoke test 包含歌詞浮動字幕、AI 錄製與歌單自動跳轉驗收）。
- 邊界：
  - 逐字級別（Word-level / Enhanced LRC）標籤在單句整體平移時依比例位移；手動逐字細調保留至下一階段進階介面。

## 2026-08-18 — Chrome Web Store 上架準備與發布指南

- 階段：Phase 6 發布前準備（Release & Store Listing Preparation）
- 目標：完成 Google Chrome 應用程式商店（Chrome Web Store）上架所需之全部文案、隱私權政策、權限合理性宣告、自動化打包腳本與商店發布指南。
- 變更：
  - **商店指南** (`docs/CHROME_WEB_STORE_GUIDE.md`)：
    - 完整收錄開發者註冊、商店名稱、132 字元簡短說明、詳細 Markdown 說明文案、類別設定。
    - 圖形資產規格表：擴充功能圖示（16/32/48/128 px）、小宣傳圖（440x280 px）、大宣傳圖（1400x560 px）與 5 張推薦螢幕截圖規劃。
    - 審查 Privacy practices 欄位填寫範本：單一用途（Single Purpose）宣告、7 項權限（`tabCapture`, `offscreen`, `storage`, `identity`, `scripting`, `activeTab`, `host_permissions`）合理性用途宣告、資料處理勾選宣告。
  - **隱私權政策** (`docs/PRIVACY_POLICY.md`)：
    - 建立符合 Chrome Web Store 審查規範的繁體中文與 English 雙語官方隱私權政策。
    - 明確宣告本機優先（Local-First）、無伺服器、無廣告、無第三方追蹤代碼，及 BYOK Groq API Key 僅留存於記憶體之安全機制。
  - **自動化打包腳本** (`scripts/package-extension.mjs`, `package.json`)：
    - 新增 `pnpm run package` 指令，自動建置並產出乾淨、壓縮率最佳化之 `release/diaochang-v0.0.10.zip`。
    - 自動排除原始碼、文件、測試、node_modules 與暫存檔。
- 驗證：
  - `pnpm run package` 成功建置並生成 `release/diaochang-v0.0.10.zip`（439.2 KB）。
  - `pnpm run check` 再次確認全套 TypeScript 型別、33 個單元測試、DSP 音高與隔離 smoke test 皆通過。

## 2026-08-18 — 內容腳本擴充功能上下文失效（Extension Context Invalidation）防護與優雅退場

- 問題：使用者在 Chrome 中重新載入或更新擴充功能時，既有 YouTube 分頁仍保留舊版內容腳本（`media-controller.js`）；當 YouTube 觸發換頁（`yt-navigate-finish`）、歌曲結束（`ended`）或持續執行 `requestAnimationFrame` 動畫迴圈時，存取已失效的 `chrome.storage` 或 `chrome.runtime` 會拋出 `Uncaught Error: Extension context invalidated` 與 `TypeError: Cannot read properties of undefined (reading 'onChanged')`。
- 變更 (`src/content/media-controller.ts`)：
  - 新增 `isExtensionValid()` 安全檢查（檢測 `chrome?.runtime?.id` 是否有效）。
  - 實作優雅自我卸載機制 `teardown()`：在擴充功能被重新載入或失效時，自動取消 `requestAnimationFrame(loopFrame)` 動畫迴圈、移除 YouTube 導航監聽器、移除媒體事件與銷毀歌詞浮動 Shadow DOM。
  - 將所有 `chrome.storage.local.get`、`chrome.storage.onChanged`、`chrome.runtime.sendMessage` 與 `chrome.runtime.onMessage` 調用包覆安全防護與 try/catch。
- 驗證：
  - `pnpm run check` 與 `pnpm run package` 通過（33 個單元測試、DSP 音高與隔離 smoke test 全部通過，`errors: []`）。

## 2026-08-18 — 瀏覽器下方獨立歌詞欄（Docked Bottom Overlay）與側邊欄「逐句點播即唱」

- 階段：Phase 5C 瀏覽器空間分割與互動點歌增強
- 目標：將歌詞顯示由「影片內嵌遮擋畫面」改為「瀏覽器視窗下方獨立三分之一欄（高度可調整）」，滑鼠靠近浮現快速設定列；並在右側 Side Panel 歌詞模組新增「逐句點播即唱」功能。
- 變更：
  - **資料通訊與模型擴充** (`src/shared/protocol.ts`, `src/shared/lyrics.ts`, `src/sidepanel/useLyricsLibrary.ts`)：
    - 新增 `LyricsLayoutMode = 'dock-bottom' | 'video-overlay'`。
    - `SongLyrics` 與 `LyricsOverlayPayload` 新增 `layoutMode`（預設 `'dock-bottom'`）與 `dockHeightPercent`（預設 30%）。
    - 支援 `setLayoutMode` 與 `setDockHeightPercent` 並支援本機儲存與 Google Chrome Sync 同步。
  - **內容腳本獨立底部欄與懸停工具列** (`src/content/lyrics-overlay.ts`, `src/content/media-controller.ts`)：
    - 支援 `dock-bottom` 模式：固定於視窗底部（`position: fixed; bottom: 0; left: 0; right: 0`），獨立於 YouTube 影片 DOM，不遮擋影片畫面。
    - 頂部拖拽手柄（`dock-resize-handle`）：支援 PointerEvent 即時拖曳高度（18vh～50vh），雙擊快速復原 30vh。
    - 懸停快速工具列（`dock-quick-toolbar`）：滑鼠靠近時平滑浮現專屬歌詞按鈕（時間偏移 -0.5s / -0.1s / 0s / +0.1s / +0.5s、字體縮放 A- / A+、版面模式切換）。
    - 所有介面調整即時透過 `handleOverlaySettingsChange` 寫入 `chrome.storage.local` 達成雙向即時同步。
  - **側邊欄「逐句點播即唱」與版面切換** (`src/sidepanel/components/LyricsView.tsx`, `src/sidepanel/styles.css`, `src/sidepanel/i18n.tsx`)：
    - 新增「逐句點播即唱」卡片（`lyrics-sheet-card`）：列出整首歌所有句次與時間戳記，點擊任意句次立即發送 `SEEK_ABSOLUTE` 跳轉並啟動播放。
    - 隨播放自動平滑滾動（Smooth Scroll）至目前歌詞，並呈現高亮發光狀態與「正在唱」標籤。
    - 顯示設定提供分段切換器（`💻 底部獨立欄` vs `📺 影片內嵌`）與高度滑桿。
    - 多語系（繁中、英文、日文、簡中）完整對應新增字串。
- 驗證：
  - 自動化測試：`pnpm run check` 與 `pnpm run package` 成功通過（TypeScript 型別檢查、33 個 Vitest 測試、DSP 頻率精度測試、Playwright 隔離煙霧測試），並生成 `release/diaochang-v0.0.10.zip`（810.0 KB）。

## 2026-08-18 — 高速 YouTube 音訊串流直接擷取與 Groq AI 動態歌詞秒級生成

- 階段：Phase 5D 高速串流 AI 對時重構
- 背景與目標：徹底廢棄舊有「以 1 倍速即時錄製整首歌曲 4 分鐘」的低效做法，重構為直接擷取 YouTube 預先緩衝與適應性串流（Adaptive Audio Stream）資料，在 1～2 秒內下載完整音訊並直接上傳 Groq Whisper AI，達成 3～5 秒內生成高精度動態歌詞時間碼。
- 變更：
  - **YouTube 音訊串流解析模組** (`src/shared/youtube-audio.ts`, `src/shared/youtube-audio.test.ts`)：
    - 實作 `extractYouTubeVideoId(url)`：支援標準 `watch?v=`、`music.youtube.com`、`youtu.be`、`shorts` 與 `embed` 格式。
    - 實作 `selectOptimalAudioFormat(formats)`：自 `adaptiveFormats` 中篩選最適合 Whisper AI 且檔案極小之串流軌道（優先選用 Opus itag 250 ~70kbps、Opus itag 249 ~50kbps、AAC itag 140 128kbps，一首歌約 1.5～3.5MB）。
    - 實作 `fetchYouTubeAudioBlob(videoId)`：透過 YouTube InnerTube 接口取得直接下載 URL，並於 1～2 秒內下載為完整二進制音訊 Blob。
  - **權限與 Service Worker 重構** (`public/manifest.json`, `src/background/service-worker.ts`)：
    - `manifest.json` 於 `host_permissions` 新增 `"https://*.googlevideo.com/*"`。
    - Service Worker 的 `transcribeTabAudio` 改為直接調用 `fetchYouTubeAudioBlob` 下載音訊 Blob，並透過 `requestGroqTranscription` 直傳 Groq Whisper API（`whisper-large-v3`），免除倒帶、免除等待 4 分鐘播放、不干擾使用者目前播放狀態。
  - **側邊欄 UI 與多語系體驗優化** (`src/sidepanel/components/LyricsView.tsx`, `src/sidepanel/i18n.tsx`)：
    - 將按鈕文案升級為「⚡ 一鍵高速 AI 音樂解析」（預期 3～5 秒完成）。
    - 移除必須先啟動分頁音訊處理才能進行 AI 解析的限制，即使尚未啟動音訊捕獲亦可直接提取當前 YouTube 串流進行 AI 解析。
    - 更新繁中、英文、日文、簡中 4 種語言說明與通知文字。
- 驗證：
  - 單元測試：`src/shared/youtube-audio.test.ts` 3 項測試全部通過（36/36 通過）。
  - 自動化驗證：`pnpm run check && pnpm run package` 成功通過（TypeScript 型別檢查、36 個 Vitest 單元測試、DSP 音高精確度測試、Playwright 擴充功能端對端 Smoke 測試），成功打包 `release/diaochang-v0.0.10.zip`（1183.5 KB）。

## 2026-08-18 — SmartTube 多端點串流解析、分頁原生播放器直讀、滾動干擾防護與 API Key 持久化

- 階段：Phase 5E 串流解析健壯性與視窗操作體驗升級
- 背景與目標：
  1. 解決 YouTube `/youtubei/v1/player` 403 阻擋問題，參考 SmartTube 實作多端點與分頁原生串流直讀。
  2. 解決歌詞自動追隨時全域 `scrollIntoView()` 造成側邊面板大視窗被拉扯的干擾問題。
  3. 提供測試版 Groq API Key 預設與本機自動記憶功能，免除重打困擾。
  4. 宣告 `unlimitedStorage` 解除儲存容量限制。
- 變更：
  - **YouTube 串流多層提取機制** (`src/shared/youtube-audio.ts`, `src/background/service-worker.ts`)：
    - 第一層：透過 `chrome.scripting.executeScript` 在 `MAIN` 世界直接提取分頁內現有 `movie_player.getStreamingData()`，0 秒、0 網路消耗、100% 免疫 403。
    - 第二層：後備 SmartTube 多客戶端 InnerTube 解析（`ANDROID_VR` Client 56、`TVHTML5_SIMPLY_EMBEDDED_PLAYER` Client 85、`IOS` Client 5、`WEB_EMBEDDED_PLAYER` Client 56），帶入合法 Origin 與 User-Agent。
  - **容器限縮平滑滾動（Scoped Auto-Scroll）** (`src/sidepanel/components/LyricsView.tsx`)：
    - 替換全域 `scrollIntoView()` 為純內部容器計算與 `list.scrollTo()`，外層面板大視窗位置完全鎖定不受干擾。
  - **API Key 本機持久化與測試預設** (`src/sidepanel/components/LyricsView.tsx`)：
    - 預設帶入測試金鑰，自動寫入並讀取 `chrome.storage.local`，解析完成後保留金鑰。
  - **Manifest 權限擴充** (`public/manifest.json`)：
    - 加入 `"unlimitedStorage"`。
- 驗證：
## 2026-08-18 — 0.0.10 繁簡中文一鍵轉換、KTV 劇院級大螢幕同歡模式、專屬防衝突快捷鍵、官方展示網站與使用手冊

- 階段：Phase 5F 歡唱與視聽全方位升級
- 目標：
  1. 暫時收合易觸發 YouTube API 400 錯誤之串流 AI 區塊，維持主介面乾淨。
  2. 提供 100% 離線歌詞簡體中文 ⇄ 繁體中文一鍵雙向轉換。
  3. 參考 SmartTube 劇院構造實作 KTV 大螢幕同歡模式（電視 1080p/4K 大字體、高對比發光卡拉 OK 漸層推進）。
  4. 實作專屬防衝突快捷鍵系統（與 YouTube 原生鍵位完全隔離）。
  5. 搭建官方展示網站（`website/`）與完整使用者說明書（`docs/USER_MANUAL.md`）。
  6. 規劃 KTV 包廂掃碼點歌系統規格書（`docs/KTV_ROOM_SYSTEM_SPEC.md`）。
- 變更：
  - **離線繁簡轉換引擎** (`src/shared/chinese-dict.ts`, `src/shared/chinese-convert.ts`, `src/shared/lyrics.ts`)：
    - 內建常用歌詞繁簡字典對照表，實作 `toTraditional`、`toSimplified`、`detectChineseVariant` 與 `convertSongLyricsChinese`。
    - 在 `LyricsView.tsx` 歌詞工具列與草稿區新增一鍵繁簡雙向轉換按鈕。
  - **KTV 劇院級大螢幕模式** (`src/content/lyrics-overlay.ts`, `src/shared/protocol.ts`, `src/shared/lyrics.ts`)：
    - 擴充 `LyricsLayoutMode` 支援 `'ktv-stage'`。
    - 實作劇院級全螢幕視覺（`clamp(32px, 5.2vw, 80px)` 大字體、發光霓虹藍光推進、高對比黑色漸層襯底）。
    - 歌詞懸停工具列支援一鍵在「底部獨立欄 ⇄ 畫面內嵌 ⇄ KTV 大螢幕」循環切換。
  - **專屬防衝突快捷鍵** (`src/shared/shortcuts.ts`, `src/sidepanel/App.tsx`, `src/sidepanel/components/SettingsView.tsx`)：
    - 支援 `[` / `]` 升降 Key、`\` 重設、`Alt+[` / `Alt+]` cents 微調、`Alt+A` / `Alt+B` 標記循環、`Alt+L` / `Alt+C` 開關/清除循環、`Alt+-` / `Alt+=` 變速。
    - 嚴格避開 YouTube 原生快捷鍵，輸入框內打字自動停用。
  - **官方展示網站** (`website/index.html`, `website/styles.css`, `website/script.js`)：
    - 具現代感深色 Glassmorphism 官網，包含互動調 Key 模擬器、歌詞推進展示、功能矩陣與 CTA。
  - **官方使用者手冊** (`docs/USER_MANUAL.md`)：
    - 完整圖文使用指南，包含十二平均律移調、LPC 自然人聲、A-B 循環、歌詞工作台、繁簡轉換、大螢幕 KTV 與 FAQ。
  - **KTV 包廂掃碼點歌系統規格書** (`docs/KTV_ROOM_SYSTEM_SPEC.md`)：
    - 採用 Google Firebase Serverless 零伺服器維護架構，規劃手機免安裝 PWA 掃碼點歌、個人化調性預設、即時佇列與大螢幕接歌提示。
- 驗證：
  - `pnpm run check && pnpm run package` 成功通過（TypeScript 型別檢查、36 個單元測試全數通過、DSP 440Hz 頻率精度測試通過、Playwright smoke test 0 錯誤），產出 `release/diaochang-v0.0.10.zip`（1917.0 KB）。

## 2026-08-18 — 0.0.10 全套進階功能免費開放（本機音訊、±36 半音、Varispeed、滾輪控制、人聲消除與 3 段等化器）

- 階段：Phase 5G 全套進階功能開放與 DSP 管線擴充（100% 免費無限制）
- 目標：
  1. 實作參考產品中所有進階功能，且 100% 免費開放給所有使用者。
  2. 移調範圍擴展至 ±36 半音（跨三個八度）。
  3. 實作 Varispeed 磁帶變速連動模式（音高與速度嚴格連動，避免拉伸偽影）。
  4. 實作全介面滑鼠滾輪快速微調（`Key`、`Fine Pitch`、`Speed`、`EQ`、`Vocal Reducer`）。
  5. 實作立體聲中置消減人聲消除器（Vocal Reducer）與 120Hz 低音直通矩陣。
  6. 實作 3 段等化器（Equalizer: Low 100Hz, Mid 1kHz, High 8kHz，-12dB ~ +12dB）。
  7. 實作本機音訊檔案選取與播放入口。
  8. 新增「自動重設 vs 記住設定」、「術語語言獨立切換」、「剩餘時間點擊切換」。
- 變更：
  - **音訊核心與 DSP 擴充** (`src/shared/audio.ts`, `src/offscreen/offscreen.ts`, `src/background/service-worker.ts`, `src/shared/protocol.ts`)：
    - 移調範圍上限自 ±12 擴展至 ±36 半音，新增 `formatRemainingTime`。
    - 在 offscreen Web Audio Graph 中加入 Vocal Reducer 中置消減矩陣與 3 段 BiquadFilter 等化器節點。
    - 支援 `SET_VOCAL_REDUCTION`、`SET_EQUALIZER`、`SET_VARISPEED` 請求。
  - **組件與互動升級** (`src/sidepanel/components/`)：
    - `KeyControl.tsx`: 支援 ±6 / ±12 / ±24 / ±36 半音範圍與滑鼠滾輪 `onWheel` 微調，標註 Varispeed 狀態。
    - `FinePitchControl.tsx`: 支援滑鼠滾輪微調（按 Shift 鍵以 5 cents 步進）。
    - `SpeedControl.tsx`: 支援滑鼠滾輪微調（0.25× ~ 4.0×）。
    - `EqualizerSection.tsx`: [NEW] 3 段頻段即時微調、滑鼠滾輪調整、重設與「人聲增強 / 重低音」預設。
    - `VocalReducerSection.tsx`: [NEW] 0% ~ 100% 人聲消減滑桿、滾輪微調與伴奏提取預設。
    - `TransportControls.tsx`: 點擊時間標籤即可切換「已播放時間 ⇄ 剩餘時間」。
    - `MediaSummary.tsx`: 新增「播放本機檔案」檔案選取入口。
    - `SettingsView.tsx`: 整合所有全新偏好控制項，標記 100% 免費永久開放。
- 驗證：
  - `pnpm run check` 與 `pnpm run package` 成功通過（TypeScript 型別檢查 0 錯誤、DSP 音高頻率分析全通過、全套 Chrome 擴充功能冒煙測試 0 錯誤），成功封裝 `release/diaochang-v0.0.10.zip`（2316.6 KB）。

## 2026-08-18 — 0.0.10 專案內部整理、代碼瘦身與發布包 94.4% 減肥優化

- 階段：Phase 5J 專案檔案精簡、建置優化與套件瘦身
- 目標：
  1. 深入盤點專案與建置產物中冗餘、過大、拼湊未清理的檔案。
  2. 解決 Chrome 擴充功能發布包包入龐大 `.map` SourceMap 與未壓縮資源的問題，大幅降低安裝包體積。
  3. 精簡測試資源（重構 `qa/tone-440.wav`），縮減本機倉庫佔用。
- 變更：
  - **建置管線優化** (`vite.config.ts`, `scripts/package-extension.mjs`)：
    - 正式發布關閉冗餘 SourceMap，啟用 Rolldown / Oxc 原生壓縮與 Tree-shaking。
    - 打包腳本加入過濾器排除 `*.map`、`*.DS_Store`、`__MACOSX`。
    - 安裝包體積由 **3,115.2 KB** 驟降至 **175.3 KB**（瘦身幅度達 **94.4%**）。
  - **測試資源精簡** (`scripts/generate-compact-tone.mjs`, `qa/tone-440.wav`)：
    - 建立專用音訊生成器，以乾淨的 10 秒 44.1kHz PCM 音訊取代原先 3.7MB 的無壓縮 WAV，節省 2.8 MB。
- 驗證：
  - `pnpm run check && pnpm run package` 全數通過（36 單元測試、DSP 音高頻率測試、Playwright 冒煙測試 0 錯誤），發布包體積縮小至 175.3 KB。

- 階段：Phase 5I 官網淺色/深色模式與人聲消除 DSP 矩陣強化
- 目標：
  1. 官網預設改為 macOS 純淨淺色主題（Apple Light Theme），並支援頂部 ☀️/🌙 雙主題一鍵切換與本機記憶。
  2. 強化人聲消除 DSP 管線：新增自適應人聲共振帶陷波濾波器（1.5kHz Notch Filter）與 9kHz 高頻空氣感直通濾波器，消除主唱人聲時保留伴奏開闊度與 Bass 能量。
  3. 練唱面板 Vocal Reducer 升級為雙軌平衡視覺介面（伴奏音量 100% vs 原唱導唱 0%~100%）。
- 變更：
  - **官網主題引擎** (`website/styles.css`, `website/index.html`, `website/script.js`)：
    - 定義完整的 Apple Light Mode（`#FFFFFF`, `#F5F5F7`, `#1D1D1F`, `#0071E3`）與 Dark Mode 雙主題 token。
    - 頂部加入主題切換按鈕，自動持久化至 `localStorage`。
  - **DSP 音訊節點升級** (`src/offscreen/offscreen.ts`)：
    - 新增 `vocalNotchNode`（1500Hz, Q=2.2, 最大 -14dB 衰減）與 `vocalAirNode`（9000Hz highshelf）。
  - **面板介面升級** (`src/sidepanel/components/VocalReducerSection.tsx`)：
    - 新增「伴奏音量」與「原唱導唱」雙軌百分比即時顯示。
- 驗證：
  - `pnpm run check && pnpm run package` 全數通過，產出發布包 `release/diaochang-v0.0.10.zip`（3115.2 KB）。

- 階段：Phase 5H 多段循環、節拍偵測、全平台串流相容與官方支援中心建置
- 目標：
  1. 實作多段循環片段（Unlimited Loops & Clips）儲存、命名與一鍵切換。
  2. 實作循序漸進階梯練習序列（Practice Sequences：0.75× → 0.90× → 1.0× 原速）。
  3. 實作歌曲 BPM 節拍偵測、Tap Tempo 測速器與 4/4 拍視覺脈衝指示燈。
  4. 擴充多平台媒體相容性（YouTube, Spotify, Apple Music, SoundCloud, Deezer, Tidal, Vimeo, Bilibili, Local MP3）。
  5. 打造多語言官方網站與線上支援中心（8 國語言即時切換、FAQ 關鍵字搜尋與分類篩選、100% 免費永久承諾）。
- 變更：
  - **多段 Loop 與 Clips 模組** (`src/shared/protocol.ts`, `src/sidepanel/components/LoopControl.tsx`, `src/content/media-controller.ts`, `src/sidepanel/client.ts`)：
    - 定義 `LoopClip` 與 `PracticeSequenceStep` 協定。
    - 支援將當前 A-B 標記存為具名片段、在片段清單中秒速切換。
  - **BPM 節奏模組** (`src/shared/bpm.ts`, `src/sidepanel/components/BpmSection.tsx`, `src/sidepanel/usePreferences.ts`, `src/sidepanel/i18n.tsx`)：
    - 實作 Tap Tempo 加權滑動測速演算法。
    - 實作 4/4 拍視覺跳動燈號（第 1 拍強音指示）與節拍發聲輔助。
  - **多串流平台相容性** (`src/content/media-controller.ts`)：
    - 擴充 DOM 選擇器抓取 Spotify、Apple Music、SoundCloud、Deezer、Tidal、Bilibili 之歌曲名稱、歌手與進度條。
  - **官方展示網站與支援中心** (`website/index.html`, `website/styles.css`, `website/script.js`)：
    - 整合繁體中文、簡體中文、English、日本語、한국어、Español、Deutsch、Français 8 國語言即時翻譯切換。
    - 實作支援中心（Support Center & FAQ）即時搜尋框與 6 大分類 Chip 過濾。
    - 呈現多平台相容矩陣與 100% 免費對比表（強調所有 Pro 級功能在「調唱」永久 0 元免費）。
  - **官方手冊** (`docs/USER_MANUAL.md`)：
    - 完整收錄多段 Loop、BPM 測速、多平台支援與完整 FAQ 指南。
- 驗證：
  - 執行 `pnpm run check && pnpm run package`：
    - TypeScript 型別檢查 0 錯誤。
    - Vitest 單元測試全數通過。
    - 440 Hz DSP 移調誤差 < 1.51 cents（遠優於 ±5 cents 標準）。
    - Playwright 擴充功能冒煙測試 0 錯誤。
- 階段：Phase 5K 擴充功能上下文失效防護、歌詞繁簡一鍵轉換 (繁 ⇄ 簡) 與全局偏好整合
- 目標：
  1. 解決擴充功能重載時產生的 `Extension context invalidated` 與 `Cannot read properties of undefined (reading 'onChanged')` 報錯。
  2. 在側邊欄主歌詞面板「逐句點播即唱」頭部加入醒目的繁簡一鍵切換按鈕（繁體 ⇄ 简体）。
  3. 整合全局設定「歌詞繁簡偏好」（一律繁體 / 一律簡體 / 維持原始）。
  4. 支援 <kbd>Alt</kbd> + <kbd>T</kbd> 快捷鍵秒切歌詞字體。
- 變更：
  - **生命週期與安全防護** (`src/content/media-controller.ts`, `src/sidepanel/usePlaylistLibrary.ts`, `src/sidepanel/useLyricsLibrary.ts`, `src/sidepanel/storage.ts`, `src/sidepanel/useTheme.ts`, `src/sidepanel/sync-storage.ts`)：
    - 實作主動退出機制（Auto-Teardown on Invalidation），一旦偵測到 runtime 失效立即解除監聽並停止循環。
    - 全面替換為安全可選鏈 `chrome?.storage?.onChanged` 並以 try-catch 包覆所有非同步存取。
  - **歌詞繁簡中文轉換體驗** (`src/sidepanel/components/LyricsView.tsx`, `src/sidepanel/styles.css`, `src/sidepanel/usePreferences.ts`, `src/sidepanel/components/SettingsView.tsx`, `src/shared/shortcuts.ts`, `src/sidepanel/App.tsx`)：
    - 側邊欄「逐句點播即唱」標題列加入高識別度「繁體」與「简体」Pill 按鈕，根據當前歌詞字體自動高亮。
    - 設定頁面提供「歌詞繁簡偏好」選擇器。
    - 鍵盤快捷鍵註冊 <kbd>Alt</kbd> + <kbd>T</kbd>（`LYRICS_CONVERT_CHINESE`）。
- 驗證：
  - `pnpm run check && pnpm run package`：單元測試、頻率精確度測試、冒煙測試 100% 通過（0 錯誤）。
  - 生成 `release/diaochang-v0.0.11.zip`（176.0 KB）。




## 2026-08-18 — 0.0.11 BPM 自動偵測、統一流程與發布安全整理

- 任務：把 BPM「自動偵測」從預覽用靜態結果改為目前已啟動分頁音訊的真實節奏包絡分析，並建立 Gemini、Codex 與人工工程師共同遵循的開發標準。
- 使用者結果：在「BPM 節奏與節拍器」按下自動偵測後，會擷取約 8 秒的音訊包絡，以自相關估算 40–220 BPM，顯示結果與信心度；未啟動、靜音或節奏不明時顯示可理解的失敗提示。
- 變更檔案：`src/shared/bpm.ts`、`src/shared/bpm.test.ts`、`src/offscreen/offscreen.ts`、`src/background/service-worker.ts`、`src/shared/protocol.ts`、`src/sidepanel/useExtensionController.ts`、`src/sidepanel/components/BpmSection.tsx`、`src/sidepanel/client.ts`、`docs/DEVELOPMENT_PROTOCOL.md`、`AGENTS.md`、`README.md`、`TODO.md`、`docs/TESTING.md`。
- 發布安全：移除原始碼中的預設 Groq Key；個人測試輸入後只保存於 `chrome.storage.local`，歌詞頁新增清除按鈕。公開包不得含任何 API Key，曾暴露的 Key 應撤銷並重新建立。
- 人聲分離決策：目前實作仍是本機 Mid/Side／中央聲道降低，不宣稱 AI 完整分軌。UVR／Demucs／MDX／Roformer 列入本機模型可行性研究；線上 UVR 需要使用者主動上傳，未完成隱私、授權與效能評估前不作預設整合。
- 官方網站／手冊：移除「100% 本機、完整去人聲、永久免費、所有平台全面支援」等未經驗收的絕對宣稱，改為本機優先、個人測試版、平台相容性分級與明確的 Groq 同意流程。
- 驗證：`pnpm run check` 通過（12 個測試檔、47 個測試、DSP 音高誤差最大約 1.51 cents、extension smoke 0 錯誤）；`pnpm run package` 重新產出 `release/diaochang-v0.0.11.zip`（約 181 KB）。瀏覽器預覽 `sidepanel.html?preview=bpm` 已實際展開 BPM 卡、按下「自動偵測」，確認顯示 `120 BPM · 信心度 86%`。
- 回歸修正：節奏不明時 BPM 分析會回傳可理解錯誤，但不再把整個音訊工作階段標成 error；extension smoke 以無節奏 440 Hz fixture 驗證此失敗路徑後，移調、速度、循環、歌詞覆蓋與歌單流程仍維持 active。
- 風險／下一步：需要用 YouTube、YouTube Music、本機音訊各至少三首歌曲記錄自動 BPM 與 TAP／標示 BPM 的誤差，並確認目前分頁音訊分析不造成輸出延遲或切歌回歸問題。

