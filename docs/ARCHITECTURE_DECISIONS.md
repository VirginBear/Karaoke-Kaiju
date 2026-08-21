# 架構決策紀錄

本檔記錄「為什麼這樣做」。決策若改變，保留舊紀錄並新增取代它的 ADR，不直接抹除歷史。

## ADR-001：採用 Chrome Manifest V3 與 Side Panel

- 狀態：已接受並完成 Phase 0 實作
- 日期：2026-08-16

### 決策

第一版做桌面版 Chrome Manifest V3 擴充功能，主要 UI 使用 Chrome Side Panel。

### 理由

- 使用者需要一邊播放影片、一邊持續看到 Key、速度、A/B 與歌詞。
- popup 一失去焦點就會關閉，不適合長時間練習。
- Manifest V3 是 Chrome Web Store 的現行平台。

### 代價

- 第一版不直接支援 Firefox、Safari 或手機。
- 需處理 service worker 會休眠、不能直接使用 DOM 的生命週期限制。

## ADR-002：使用 tabCapture + Offscreen Document 作為主要音訊路徑

- 狀態：Phase 0 技術驗證通過
- 日期：2026-08-16

### 決策

在使用者明確啟動後，用 `chrome.tabCapture` 取得目前分頁音訊，交由 offscreen document 的 Web Audio／AudioWorklet 處理，再輸出到喇叭。

### 理由

- 直接用 `createMediaElementSource()` 連接跨來源串流時，容易遇到網站、CORS 與播放器實作差異。
- tab capture 對網站來源較中立，也較接近「處理使用者正在聽到的分頁音訊」。
- offscreen document 能提供 service worker 沒有的 DOM 與 Web Audio 執行環境。

### 代價與限制

- 必須由使用者手勢啟動。
- 會處理整個分頁的聲音，不只歌曲。
- 串流平台與 DRM 仍需逐站驗證。
- 停止、切換分頁、重新導覽與錯誤恢復必須有嚴格狀態機。

## ADR-003：資料 local-first，Google Drive 同步為選用

- 狀態：已接受為 Phase 4 方向，尚未實作
- 日期：2026-08-16

### 決策

所有使用者先使用本機資料；只有使用者主動開啟同步時，才透過 Google OAuth 把播放清單與歌詞存入該使用者的 Drive `appDataFolder`。

### 理由

- 不需要開發者自有資料庫或帳號後端。
- 基本練唱不應被登入或網路狀態阻擋。
- `chrome.storage.sync` 約 100 KB 的容量不足以可靠存放多份歌詞。

### 代價

- 仍需 Google Cloud OAuth client、scope、隱私政策與發布審查。
- 必須做離線佇列、版本號、同步衝突與使用者刪除資料流程。

## ADR-004：移調必須使用 DSP，不以 playbackRate 假裝升降 Key

- 狀態：已接受為產品原則
- 日期：2026-08-16

### 決策

Key 以 `2^(semitones/12)` 為核心倍率，透過即時時間伸縮／音高偏移演算法處理；速度為獨立參數。

### 理由

這是產品最重要的功能。如果只調 `playbackRate`，音高與速度會一起改變，無法符合唱歌練習需求。

### 候選實作

- 優先驗證 SoundTouchJS AudioWorklet。
- 用 Tone.js PitchShift 作快速品質比較。
- Rubber Band 只作演算法／品質參考，未解決 GPL 或商業授權前不整合。

### 定案條件

Phase 0 的頻率誤差、延遲、音畫同步、斷音、CPU 與人聲聽測全部通過後才鎖定套件與版本。

## ADR-005：歌詞以使用者匯入為第一來源

- 狀態：提案
- 日期：2026-08-16

### 決策

第一版歌詞只接受使用者匯入或自行編輯，不自動從歌詞網站抓取。

### 理由

- 避免把歌詞授權與第三方 API 變成核心功能的阻塞點。
- 不同歌詞來源的時間碼品質差異大。
- 使用者提供 `.lrc` 時可直接做逐句同步；純文字則清楚標示需手動校時。

## ADR-006：去人聲分兩層，不承諾完全消除

- 狀態：提案
- 日期：2026-08-16

### 決策

先做可即時執行的中央聲道消減；本機 AI 分軌作獨立研究，不放進初版完成定義。

### 理由

- 傳統聲道消減容易、延遲低，但效果受混音方式限制。
- Demucs 類模型可提供更好的分離，卻會帶來大模型、WebGPU、記憶體、處理時間與商店政策問題。
- UI 與文案必須使用「人聲降低」，除非測試能證明更強的結果。

## ADR-007：Phase 0 採用 SoundTouchJS AudioWorklet 2.1.1

- 狀態：Phase 0 已採用；0.0.4 的節點選擇由 ADR-009 取代
- 日期：2026-08-16

### 決策

Phase 0 使用 `@soundtouchjs/audio-worklet@2.1.1`，由 offscreen document 建立 `AudioContext`，以 `SoundTouchNode.pitch` 套用 `2^(semitones/12) × 2^(cents/1200)`。

### 驗證證據

- 440 Hz 測試涵蓋 `−12`、`−7`、`−2`、`0`、`+2`、`+7`、`+12`，全部低於 ±5 cents；最差值為 +7 的約 +1.51 cents。
- 本機 HTML5 audio 與真實 YouTube 分頁都能啟動 tab capture、移調、變速、A–B 與停止。
- 自動測得 AudioContext 基礎輸出延遲 29 ms，低於 Phase 0 的 150 ms 目標。
- 600.764 秒穩定性測試取樣 597 次，沒有 inactive 狀態；啟動緩衝後新增 1 個 underrun。

### 保留條件

純音測試不能取代人聲、和聲、鼓點與極端移調的主觀聽感。使用者完成第一輪實唱後，才決定是否直接鎖版，或比較 formant-preserving／其他 DSP 方案。

## ADR-008：從 Chrome action 叫用啟動 tab capture

- 狀態：已接受並於 `0.0.3` 實作
- 日期：2026-08-16

### 決策

不再讓 Chrome 在點 action 圖示時只開啟側邊面板。改由 `chrome.action.onClicked` 處理使用者叫用，先開啟目前分頁的 side panel，再偵測媒體並對同一分頁啟動 `tabCapture`。

### 理由

- YouTube host permission 可以讓 content script 穩定偵測媒體，但不等於使用者已叫用擴充功能。
- Chrome 要求 `tabCapture` 只能在使用者叫用擴充功能後取得；side panel 裡一般按鈕的點擊不會補上目前分頁的 `activeTab` 叫用。
- 將「開面板」與「第一次啟動音訊」收旂到同一個圖示點擊，使用者只需一個明確動作。

### 代價與驗證

- 擴充功能重新載入、切到其他來源或 Chrome 收回叫用權限後，使用者必須在目標分頁再點一次圖示。
- 自動化 Chrome 的 allowlist 會繞過真實叫用限制，因此 action 圖示授權保留一項日常 Chrome 手動驗收；擷取、DSP 與媒體控制仍由自動 smoke test 驗證。

## ADR-009：以半音參數與共振峰修正提供自然人聲移調

- 狀態：已接受並於 `0.0.4` 實作
- 日期：2026-08-16

### 決策

改用 `@soundtouchjs/formant-correction-worklet@2.1.1` 的 `FormantCorrectionNode`。Key 直接傳入整數 `pitchSemitones`，cents 才使用 `2^(cents/1200)`；預設開啟 LPC 共振峰修正，並提供「標準」模式比較。

### 理由

- 十二平均律的音程計算原本正確，但傳統 pitch shifting 會連帶搬移人聲共振峰，形成升 Key 尖細、降 Key 低沉的音色。
- 套件的半音參數明確定義每個整數為一個 half step；直接使用比先自行換算整體倍率更容易稽核音樂語意。
- 共振峰修正改善的是音色，不改變 `2^(n/12)` 的音高目標，也不把 Key 與速度綁定。

### 驗證

- 單元測試明確驗證 C 的 `+1` 比值為 C♯／D♭、`+2` 為 D。
- 440 Hz 的 7 個驗收點仍全部低於 ±5 cents，最差約 +1.51 cents。
- Chrome 擴充 smoke test會切換標準／自然人聲，確認最終 `formantStrength = 1`、+7 Key、0.75×、A–B 與停止皆正常。

### 限制

共振峰修正能降低 chipmunk／giant voice 效果，但不保證所有歌手、和聲、極端 ±12 半音都與錄音室離線演算法同等自然；仍以使用者實唱聽感作最終判斷。

## ADR-010：0.0.4 歌單採本機優先、帳號同步延後

- 狀態：已接受並於 `0.0.4` 實作本機基本版
- 日期：2026-08-16

### 決策

先以具 `schemaVersion` 的 `chrome.storage.local` 儲存多歌單與每首歌的練習 preset。Google 登入與 Drive `appDataFolder` 只在 OAuth client、隱私政策、衝突規則與刪除流程完成後才啟用。

### 理由

- 歌單不應因尚未登入或沒有網路而無法使用。
- 現階段資料量小，先使用 extension local storage 可快速驗證真實整理流程。
- 不顯示假的登入成功或捐款入口；設定頁明確標示「尚未啟用／尚未設定」。

### 後續遷移

歌詞與同步佇列資料量變大時遷移到 IndexedDB；本機歌單維持離線真相來源，再由 Drive `appDataFolder` 做選用同步。

## ADR-011：歌單第一階段以 Chrome Sync 連動 Google 帳號

- 狀態：已接受並於 `0.0.5` 實作
- 日期：2026-08-16

### 決策

歌單先使用 `chrome.storage.sync` 跨電腦同步，並用 `chrome.identity.getProfileUserInfo()` 顯示目前 Chrome 的主要 Google 帳號。Drive `appDataFolder` 保留給歌詞與超過 100 KB 的資料階段。

### 理由

- 使用者要的是登入同一個 Chrome Google 帳號後，在不同電腦看到同一批歌單。
- Chrome Sync 原生支援離線保存與重新連線後續傳，不需要開發者後端或額外 OAuth client。
- 歌單 metadata 不含音樂檔與歌詞，初期可控制在約 100 KB 配額內。

### 實作限制

- 每個 sync item 約 8 KB，因此 library 會編碼並切成 7000 字元 chunks；總量到 100 KB 時介面會顯示同步錯誤，本機資料仍保留。
- 跨電腦需安裝相同 ID 的擴充功能。開發版 manifest 加入固定 public key；正式上架前改用 Chrome Web Store 項目提供的 key。
- `storage.sync` 不是 Google Drive 可見檔案，也不適合存大量歌詞；大容量階段仍採 Drive `appDataFolder`。

## ADR-012：歌單控制目前分頁並維持既有 tab capture

- 狀態：已接受並於 `0.0.5` 實作
- 日期：2026-08-16

### 決策

點擊歌單歌曲時用 `chrome.tabs.update()` 導覽既有練唱 tab，不呼叫 `chrome.tabs.create()`。Service worker 保存播放佇列，content script 回報 media ended；同一 tab 的 capture 與 Side Panel 持續存在。

### 理由

- 新分頁會讓 Side Panel 與 `activeTab`／tab capture 使用者叫用脫節，迫使使用者重複點工具列圖示。
- 練唱是持續面對同一控制面板的 KTV 流程；影片是可替換內容，控制器不應每首歌重建。
- 每首 track 的 preset 必須在新媒體 ready 後自動套用，才算真正可使用的歌單。

### 已知邊界

YouTube 有固定 content script 權限，可穩定在導覽後恢復控制。其他網站若只靠一次性 `activeTab`，跨來源導覽仍可能需要該網站的選用 host permission；會在新增正式平台 adapter 時逐站申請，不先要求 `<all_urls>`。

## ADR-013：介面採內建四語字典，品牌名稱不翻譯

- 狀態：已接受並於 `0.0.6` 實作
- 日期：2026-08-17

### 決策

Side Panel 使用型別化的本機字典支援繁體中文、英文、日文與簡體中文；Chrome manifest 另用標準 `_locales`。使用者選擇存在偏好設定中，切換後不需重載。產品名稱 `Karaoke Kaiju` 在四種語言維持相同品牌字樣。

### 理由與限制

- 所有文案隨擴充功能打包，不依賴遠端翻譯或網路。
- 型別化 key 能在建置時發現缺字，不會在產品中露出未翻譯代碼。
- 現階段沒有多數／性別等複雜 ICU 規則；若未來加入更多語言再評估專用 i18n library。

## ADR-014：最近播放為本機衍生資料，歌單才進入 Chrome Sync

- 狀態：已接受並於 `0.0.6` 實作
- 日期：2026-08-17

### 決策

最近播放用獨立、具 schema version 的 `chrome.storage.local` 保存，最多 50 首；歌單沿用使用者主動開啟的 `chrome.storage.sync`。最近歌曲加入歌單後才成為跨電腦同步資料。

### 理由

- 最近播放變動頻繁，若每次播放都寫入 sync，容易浪費配額並製造跨裝置噪音。
- 本機歷史不要求帳號，亦可由使用者關閉自動保存或單獨清除。
- 真正需要跨裝置保留的練習曲由使用者明確加入歌單，資料意圖更清楚。

## ADR-015：參考產品只作資訊架構研究，未完成模組必須誠實標示

- 狀態：已接受並於 `0.0.6` 落實
- 日期：2026-08-17

### 決策

參考畫面用於辨識控制分組、設定覆蓋範圍與資料庫流程，不複製其黃色品牌、名稱、訂閱頁、圖示、文案或畫面資產。尚未完成的 EQ、人聲降低等項目只顯示停用的「後續階段」，不可出現無作用的假開關。

### 理由

這能保留 Karaoke Kaiju 乾淨的 Apple 式明暗視覺，也讓使用者清楚分辨現在可用與未來規劃的功能。

## ADR-016：歌詞採使用者匯入與明確同意的 BYOK AI 對時

- 狀態：已接受並於 `0.0.7` 實作第一版
- 日期：2026-08-17

### 決策

歌詞來源只接受使用者選取／貼上的 LRC，或使用者有權使用的本機音檔。AI 對時採 Groq BYOK：只有按下產生、勾選上傳同意並授予 `https://api.groq.com/*` 選用權限後才呼叫 API；Key 只存在 React 記憶體，不寫入 Chrome storage。播放器內容腳本只讀已解析的時間碼並負責顯示，不抓取歌詞網站或下載串流媒體。

### 理由

- 保留使用者對音檔外傳的控制權，且不建立開發者持有的歌詞／音訊雲端。
- LRC 可離線使用；Enhanced LRC 與 Groq word timestamps 可逐字推進，普通 LRC 則有可預測的逐句退化模式。
- 不內建第三方完整歌詞，降低著作權、來源可用性與 Chrome Web Store 審查風險。

### 已知邊界

- 0.0.7 歌詞資料使用 `chrome.storage.local`，尚未跨裝置同步。
- AI 辨識精度取決於混音、主唱清晰度與模型；仍需提供 offset 校正，後續再加入逐句編輯。
- 內容腳本必須保持單一 classic script，不能產生 ESM import，因 Chrome 的 manifest content script 與 `executeScript({files})` 以傳統腳本載入。

## ADR-017：個人歌詞先沿用選用的 Chrome Sync

- 狀態：已接受並於 `0.0.8` 實作
- 日期：2026-08-17

### 決策

歌詞永遠先寫入 `chrome.storage.local`。只有使用者主動開啟既有「Google 帳號與 Chrome 同步」後，才把歌詞、整體 offset、字體、遮罩透明度與位置用獨立分塊 codec 寫入 `chrome.storage.sync`。同步沿用 manifest 已有的 `storage`、`identity` 與 `identity.email`；不新增 OAuth web flow、Drive API 或開發者後端。

### 理由

- 使用者要的是跟隨自己的 Chrome Google 帳號跨電腦還原，同一個選用開關比另建登入流程更直接。
- Chrome Sync 的資料不會成為一般 Drive 檔案，也不需要維護伺服器或持有使用者資料。
- 本機優先讓離線、配額超限或同步暫時失敗時仍可練唱。

### 配額與衝突

- 約 100 KB 總配額由歌單與歌詞共同使用；7000 字元分塊、checksum 與完整性檢查避免半包資料覆蓋本機。
- 初次連動及遠端更新採 `updatedAt` newest-wins；逐句合併留待有編輯器後再設計。
- 大量逐字歌詞超出配額時，後續才評估 Drive `appDataFolder` 或匯出／匯入；0.0.8 不把 Chrome Sync 描述成無限雲端。

## ADR-018：目前分頁 AI 採即時錄製，不下載網站媒體

- 狀態：已接受並於 `0.0.9` 實作
- 日期：2026-08-17

### 決策

AI 歌詞直接沿用使用者已啟動的 `tabCapture` MediaStream，在 offscreen document 用 `MediaRecorder` 以 64 kbps Opus 即時錄製。錄製完整首歌曲後，由 offscreen document 直接送 Groq 並只回傳 JSON 時間碼；不攔截網站請求、不解析串流 URL、不下載 YouTube 媒體檔。

### 理由與限制

- 這能支援 YouTube 與 YouTube Music，同時維持 Chrome 要求的使用者手勢、現有 capture 音訊路徑與明確上傳同意。
- API Key 只存在 Side Panel、service worker 與 offscreen document 的當次記憶體，不寫入 storage。
- 即時錄製所需時間約等於歌曲長度；面板關閉、歌曲切換或網路中斷仍可能使當次工作失敗，後續再評估可恢復的背景工作模型。
- 錄製前暫停 A–B 與歌單跳轉，完成或取消後恢復原始播放狀態，避免為了 AI 對時破壞練唱設定。

## ADR-019：歌詞時間軸逐句工作台、多格式匯入匯出與打拍對時

- 狀態：已接受並於 `0.0.10` 實作
- 日期：2026-08-17

### 決策

在 Side Panel 歌詞模組新增完整時間軸工作台（Timeline Editor），包含：
1. **多格式支援**：自動偵測並解析 Standard LRC、Enhanced LRC、SRT、WebVTT 與純文字歌詞；支援反向匯出為 Standard LRC、SRT 與 WebVTT，並提供剪貼簿複製與 `.lrc` / `.srt` / `.vtt` 檔案下載。
2. **逐句微調與跳轉**：支援單句開始/結束時間微調（±0.1s / ±0.5s）、一鍵將開始/結束時間對齊至目前播放時間、點擊快速跳轉（Seek）至該句、內嵌文字修改、單句刪除與新增。
3. **區段平移與版本復原**：支援「自此句往後平移（Shift from here）」功能（±0.1s / ±0.5s），並在 `SongLyrics` 中保存 `originalLines` 快照，支援一鍵復原至原始匯入版本。
4. **即時打拍對時（Tap-to-Time）**：提供鍵盤快捷鍵（Space / Enter）與介面敲擊模式，讓純文字或未對時歌詞在播放過程中即時標記每句的時間戳記。
5. **預唱前置時間（Lead Time）**：可自訂即將演唱之歌詞提早出現的時間（0.5s 至 3.0s，預設 1.5s），同步套用於 Side Panel 預覽與影片浮動字幕（Content Script Shadow DOM）。

### 理由與架構整合

- 既有的全域 offset 無法修正歌曲中段速度變化或局部偏移；逐句編輯器結合「自此句往後平移」大幅降低手動調校時間碼的難度。
- 資料層結構向後相容：所有編輯儲存於 `chrome.storage.local`，並透過原有 7000 字元分塊 codec 與 checksum 安全同步於 `chrome.storage.sync`，不破壞舊版本資料格式。
- 正則表達式設計避免全域 `/g` 旗標的 `lastIndex` 狀態副作用，確保解析與輸出在多次呼叫下的純函數穩定性。

## ADR-020：瀏覽器畫面下方獨立歌詞欄與側邊欄「逐句點播即唱」

- 狀態：已接受並於 `0.0.10` 實作
- 日期：2026-08-18

### 決策

1. **三分割視窗版面架構**：
   - 右側：Chrome Side Panel（音調 Key/Fine Pitch 控制、播放控制、逐句點播清單與時間軸編輯器）。
   - 左側主視窗切分為：
     - 上方：YouTube 影片播放視窗。
     - 下方：獨立底部歌詞欄（`dock-bottom` 模式，預設佔據 30% 視窗高度，相容原有 `video-overlay` 影片內嵌模式）。
2. **可調整高度與滑鼠靠近浮現快速設定列**：
   - 底部歌詞欄頂部具備拖拽手柄（`dock-resize-handle`），可自由拖動調整高度（18vh～50vh，雙擊快速重置為 30vh）。
   - 滑鼠懸停（Hover）靠近歌詞欄時，平滑浮現歌詞專屬快速控制工具列（時間偏移 ±0.1s / ±0.5s / 重置、字體縮放 A- / A+、版面模式切換）。
3. **側邊欄「逐句點播即唱」**：
   - 在右側 Side Panel 歌詞分頁提供完整歌曲逐句列表，顯示時間碼、播放圖示與歌詞文字。
   - 點擊任意一句歌詞，立即發送 `SEEK_ABSOLUTE` 跳轉至該句時間戳並確保播放器處於播放狀態（`SET_PLAYBACK: paused: false`），方便快速選取段落反覆練習。
   - 隨著歌曲播放，歌詞列表自動平滑滾動（Smooth Scroll）至當前句並加上藍色發光與標籤標記。
4. **雙向狀態同步與持久化**：
   - Content Script 的滑鼠調整與拖曳高度透過 `onSettingsChange` 即時寫入 `chrome.storage.local`，Side Panel 透過 Storage 監聽自動同步狀態，並隨 Chrome Google Sync 一併跨裝置漫遊。

---

## ADR-021: 高速直接擷取 YouTube 音訊串流進行 AI 解析與時間軸生成 (Direct Stream Fetching for Groq AI)

### 背景與問題
舊版「分頁即時錄音」使用 `tabCapture` 從歌曲第 0 秒開始以 1 倍速錄製音訊，一首 4 分鐘的歌曲需要使用者等待 4 分鐘才能完成錄製並上傳對時，極度影響使用者體驗且缺乏效率。實際上 YouTube 在播放器緩衝或頁面載入時，已具備完整音訊串流軌道。

### 決定
1. **捨棄 1 倍速即時錄製等待機制**：
   - 不再要求播放器從頭播放、倒帶或靜音錄音。
2. **高速擷取 YouTube Adaptive Audio Stream**：
   - 透過 `extractYouTubeVideoId` 解析當前分頁之 YouTube 影片 ID。
   - Service Worker 向 YouTube InnerTube API 查詢適應性串流（`adaptiveFormats`），精準選取輕量且高音質之音訊軌（優先順序：Opus itag 250 ~70kbps、Opus itag 249 ~50kbps、AAC itag 140 128kbps）。
   - 直接藉由擴充套件之 `host_permissions`（`https://*.googlevideo.com/*`）在 1～2 秒內下載完整歌曲音訊（約 1.5～3.5MB）。
3. **極速 AI 對時與多粒度時間碼生成**：
   - 下載後的二進制音訊 Blob 直接透過 `requestGroqTranscription` 傳送至 Groq Whisper 模型 API（`whisper-large-v3`），約 2 秒內完成解析並回傳逐句（sentence）與逐字（word）動態時間戳。
   - 整體流程在 3～5 秒內完成，使用者無需等待歌曲播放，也不干擾目前正在練唱的播放狀態。

---

## ADR-022: SmartTube 多端點串流解析、分頁原生播放器串流直接讀取與容器限縮滾動優化 (In-Tab Extraction & Scoped Auto-Scroll)

### 背景與問題
1. **YouTube HTTP 403 阻擋**：YouTube 對於未附帶正確客戶端特徵或 Cookie 的 `/youtubei/v1/player` 請求會返回 HTTP 403。
2. **滾動干擾問題**：側邊欄歌詞逐句點播即唱原先使用全域 `scrollIntoView()`，導致歌曲播放換句時，整個側邊欄大視窗被強制滾動到底部歌詞區，干擾使用者在頂部調整 Key、速度或操作其他控制項。
3. **API Key 重複輸入問題**：每次重新開啟面板需手動重新輸入測試金鑰，降低開發與使用效率。

### 決定
1. **多層防護串流解析架構（借鏡 SmartTube）**：
   - **第一層（分頁原生提取，100% 403-proof）**：透過 `chrome.scripting.executeScript` 在 YouTube 分頁 `MAIN` 世界直接讀取已載入之 `movie_player.getStreamingData()` 與 `window.ytInitialPlayerResponse.streamingData`，使用使用者當前已認證授權之串流軌道，0 秒延遲且完全不受 403 阻擋。
   - **第二層（SmartTube 多客戶端 InnerTube 後備）**：若分頁原生尚未就緒，依序使用 SmartTube 之 `ANDROID_VR`（Client 56）、`TVHTML5_SIMPLY_EMBEDDED_PLAYER`（Client 85）、`IOS`（Client 5）與 `WEB_EMBEDDED_PLAYER`（Client 56）搭配合法 User-Agent 與 Origin 請求音訊串流。
2. **容器限縮平滑滾動（Container-Scoped Auto-Scroll）**：
   - 捨棄 `activeElement.scrollIntoView()`，改為計算歌詞項目在清單容器內的相對座標（`list.offsetTop`），僅調用內部容器 `sheetListRef.current.scrollTo({ top, behavior: 'smooth' })`。
   - 僅當當前歌詞超出歌詞小視窗範圍時內部微調，外層側邊面板大視窗位置完全固定，不再發生視窗拉扯。
3. **API Key 本機持久化與預設帶入**：
   - 預設載入測試專用金鑰，並於使用者變更時自動同步至 `chrome.storage.local`（`groqApiKey`），完成辨識後不再主動清空輸入框。
4. **宣告 `unlimitedStorage` 權限**：
   - 在 `manifest.json` 宣告 `unlimitedStorage`，徹底移除 10MB 本機儲存上限，支援儲存數萬首歌曲之完整動態歌詞與練習設定。

## ADR-022：0.1.0 採單一程式碼、公開／開發雙建置

### 決策

以 `src/shared/release-channel.ts` 定義功能政策。`vite build` 預設產生 `public` 建置，只呈現並允許已完成公開驗收的核心練唱功能；`vite build --mode development` 產生 `development` 建置，供本機研究使用。

公開建置除隱藏按鈕外，也在背景訊息入口拒絕研究指令，並由 Vite 產生 Manifest 時移除 OAuth、選用外部 API 與 Googlevideo 串流網域。開發建置才補回相應網域。

### 理由

- 測試者看到的功能、商店文案與權限必須完全一致。
- 保留單一程式碼可避免長期維護兩份互相漂移的實作。
- 功能政策的單元測試、Chrome E2E 與發布檢查可以阻止開發功能誤入正式包。

### 分支

`main` 是可公開交付版本，`develop` 是研究整合版本，發布候選使用短期 release 分支與 PR。任何開發建置產物都不得作為公開附件。

