# Karaoke Kaiju 側邊面板與 KTV 覆蓋 UI 規格（0.1.0 公開測試基線）

- 視覺基準：`public/brand/` 正式圖示、`website/` 官網與目前 Side Panel 實作；舊版概念稿只保存在本機設計歷史
- 實作尺寸：420 × 900 CSS px，並支援 320–480 px 面板寬度
- 狀態：根據第一輪使用體驗回饋採用

## 設計目標

介面必須乾淨、簡單、俚落，使用 macOS／iOS 式的字體、色彩與資訊層級。使用者打開面板後，順序必須是：

1. 知道是否找到歌曲。
2. 知道音訊處理是否已啟動。
3. 可直接開始練唱，或直接調 Key 自動啟動。
4. Key、Fine Pitch、速度、A–B 與播放控制依重要性排列在同一條連續捲動路徑，底部導覽保持固定。

## 狀態文案

- 媒體偵測：正在偵測歌曲、已找到歌曲、尚未找到可播放媒體、重新偵測。
- 偵測失敗必須區分：無法連接目前分頁、YouTube 連線失敗、頁面已連接但等待媒體；不可吞掉背景權限或注入錯誤。
- 音訊引擎：開始練唱、正在啟動音訊處理…、音訊處理中、停止音訊處理。
- 不再使用單獨的「尚未啟動」作為全局狀態，避免把「已找到歌曲，但還沒有啟動 DSP」誤認為擴充功能故障。

## 主題與色彩

### 亮色

```text
background        #F5F5F7
surface           #FFFFFF
text              #1D1D1F
secondaryText     #6E6E73
tertiaryText      #8E8E93
separator         #D2D2D7
accent            #007AFF
success           #248A3D
danger            #D70015
```

### 暗色

```text
background        #000000
surface           #1C1C1E
text              #F5F5F7
secondaryText     #98989D
tertiaryText      #8E8E93
separator         #38383A
accent            #0A84FF
success           #30D158
danger            #FF453A
```

色彩只有四種語意：藍色是主要操作，綠色是成功／啟用，紅色是錯誤／停止，其餘都是中性色。不使用珊瑚、青綠主要配色、裝飾漸層、光暈或多層陰影。

## 字體

- `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `SF Pro Display`, `PingFang TC`, `Helvetica Neue`, sans-serif。
- 品牌 25 px / 730；歌曲標題 17 px / 680；Key 數值 58–72 px / 690。
- 數值使用 tabular numerals，半音正負號維持固定寬度感。

## 版面

- Header 左側顯示 Karaoke Kaiju 方形怪獸頭像、品牌名與目前歌曲／處理狀態，右側只保留設定入口；亮暗切換集中在設定。
- 歌曲區使用單一 surface，上方為偵測狀態，中間為歌曲資訊，下方為全寬開始／停止按鈕。
- Key 是主視覺焦點；減、數值、加使用對稱版面。
- Key、Fine Pitch、速度與 A–B 使用同一套輕量控制卡；靠留白與髮絲框線分層，不使用厚重陰影。
- Bottom nav 固定於底部，選取項使用系統藍。

## 互動規則

- 主要按鈕高度至少 44 px，圖示按鈕必須有 `aria-label`。
- 第一次調整 Key 時，如果歌曲已找到而音訊尚未啟動，應自動啟動音訊處理。
- 手動「開始練唱」與 Key 自動啟動共用同一個去重複的啟動流程，不可重複開啟 capture。
- 偵測失敗顯示頁內「重新偵測」，不使用 alert。
- 主題選擇存在 `chrome.storage.local`；開發預覽存在 `localStorage`。
- `prefers-reduced-motion` 時取消位移動畫，鍵盤焦點使用系統藍外框。

## 實作元件

```text
SidePanelApp + I18nProvider
├── HeaderStatus + SettingsButton
├── MediaSummary + DetectionState + EngineAction
├── PracticeView
│   ├── KeyControl
│   ├── FinePitchControl
│   ├── SpeedControl
│   ├── LoopControl
│   └── TransportControls
├── RecentView + Search + PlaylistChooser
├── PlaylistsView
│   ├── CurrentMediaStrip
│   ├── PlaybackQueueMode (Sequential / RepeatOne)
│   ├── PlaylistList
│   ├── PlaylistDetail + CurrentTrack
│   └── Create / Rename / Select sheets
├── SettingsView
│   ├── ChromeGoogleSync + Privacy + Version
│   ├── Theme + ButtonSize + Language
│   ├── Playback + Audio + Layout
│   └── Shortcuts + DataReset
├── LyricsView
│   ├── CurrentSong + CompactPlaybackAndAB
│   ├── TwoLineKaraokePreview + FineTiming
│   ├── FontOpacityPosition + ChromeSync
│   ├── LrcImport
│   └── GroqAiTiming
└── BottomNavigation
```

## 0.0.4 歌單與設定增量

- Header 右側加入齒輪設定入口；設定頁使用獨立返回列，避免與練唱控制混在一起。
- 設定只提供亮色／暗色兩套主題，以及精簡／標準／大三種按鍵尺寸。
- 移調品質預設為「自然人聲」；說明文字直接指出共振峰修正的目的。
- 歌單頁優先顯示目前歌曲與「加入歌單」，下方才是多歌單管理與選定歌單內容。
- 歌曲列顯示保存的 Key 與速度，讓使用者不必打開歌曲才知道練習 preset。
- Google Drive 與捐款在未設定前必須明確顯示狀態，不得提供看似可用但實際無效的按鈕。

## 0.0.5 播放佇列、同步與按鍵尺寸增量

- 點歌必須導向目前的音訊 tab，不得開啟新分頁；側邊面板與 capture 工作階段保持不變。
- 目前歌單是背景播放佇列；支援上一首、下一首、依序播完自動下一首與單曲循環。
- 切歌等待媒體就緒後，自動套用歌曲保存的 Key、cents、速度與 A–B；不要求再次點擴充功能圖示。
- 目前歌曲列同時使用藍色 surface、播放狀態文字與佇列位置辨識，不只依賴單一顏色。
- Google 連動區明確命名為「Google 帳號與 Chrome 同步」，顯示 email、連動狀態、重新檢查、容量與錯誤。
- Chrome Sync 未啟用或只有 Chrome 登入而沒有 Sync 時，不可假裝連動成功，應提供可行的 Chrome 設定指引。
- 按鍵尺寸必須影響整個操作面，而非只改少量 padding：精簡約 26 px、標準約 32–34 px、大約 40–44 px；主要啟動按鈕仍維持至少 44 px。

## 0.0.6 四語工作台與資料庫增量

- 參考產品只提供「控制卡、長設定、歷史／資料庫」的資料架構；視覺改用 Karaoke Kaiju 系統藍、灰階、Apple 系統字與亮暗雙主題。
- Header 僅保留歌曲／處理狀態和設定入口；主題切換集中到設定，減少每次練唱的視覺噪音。
- Bottom nav 固定四個等寬項目：練唱、最近、歌單、歌詞；文字與圖示都必須跟語言切換。
- 主控制卡共用 16 px 圓角、髮絲框線與一致標題列；Key 最大，Fine Pitch／速度次之，A–B 允許向下捲動。
- 「最近」使用真實縮圖、標題、平台／相對時間及 Key／速度，主動作是同分頁播放，次要動作是加入歌單與移除。
- 設定採長捲動 grouped list；可用選項可操作，未完成模組為停用列並標記「後續階段」。
- 四語為繁中、英文、日文、簡中，所有可見文字與 `aria-label` 都使用同一字典；品牌 `Karaoke Kaiju` 維持不翻譯。

## 0.0.7 雙行 KTV 歌詞增量

- 視覺驗收以目前 Shadow DOM 雙行覆蓋實作與 `docs/UI_FIDELITY.md` 為準。
- 影片覆蓋層固定在播放器下三分之一，保持透明黑遮罩、白字與 iOS 系統藍，不使用參考產品的黃色品牌。
- 同時只顯示目前句和下一句；偶數句左上、下一句右下，之後交換，讓演唱者在唱目前句時先看到下一句。
- 目前句由白色底字與藍色複本疊合，以 `clip-path` 呈現左至右進度；下一句維持白色。
- 覆蓋層使用 Shadow DOM 隔離 YouTube 樣式，`pointer-events: none`，不阻擋播放器操作。
- 歌詞頁依序提供預覽／開關、整體 offset、LRC 匯入、外部 AI 對時；API Key 欄位不使用持久化儲存。
- 320–480 px 側邊面板不得水平溢出；長檔名、歌名與來源需省略或換行。

## 0.0.8 歌詞練唱控制與個人同步增量

- 歌詞頁目前歌曲後直接放置精簡傳輸列；播放／暫停是藍色主要圓鈕，前後跳轉與 A／B／循環／清除維持同一視覺群組。
- 對時提供 0.1 秒精調與 0.5 秒快調，所有按鈕都有完整 aria 名稱；數值固定顯示一位小數。
- 顯示控制與預覽放在同一張覆蓋卡：字體 80–140%、遮罩 20–90%、上下位置及重設，避免使用者到設定頁來回切換。
- 個人同步卡明確說明資料進入 Chrome Google Sync、顯示目前帳號與約 100 KB 用量；不使用「Drive 檔案」或「開發者雲端」等容易誤解的文案。
- 320 px 下 A／B 控制改為兩欄、同步按鈕改為全寬；420 px 保留單列高密度控制，兩者皆不得水平溢出。

## 0.0.11 目前分頁 AI 錄製與 BPM 分析增量

- AI 卡先呈現藍色淡底的「直接使用目前 YouTube 分頁」主路徑，本機音訊以分隔線放在第二順位。
- 直接錄製按鈕只有在媒體存在、音訊處理 active、Key 與同意皆成立時啟用；否則在卡內顯示可操作的啟動提示。
- 錄製時按鈕轉為取消動作，說明列顯示目前時間／總長度並提醒保持面板與歌曲分頁開啟。
- 420 px 與 320 px 都維持單欄表單、完整同意文字與至少 40 px 主操作高度，不得水平溢出。
