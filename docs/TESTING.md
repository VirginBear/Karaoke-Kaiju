# Karaoke Kaiju 測試與載入方式

## 0.1.0 標準化驗收

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run package
```

`pnpm run check` 依序執行：

1. TypeScript 型別檢查。
2. Vitest 單元測試。
3. Vite 公開版正式建置。
4. DSP 音高精度測試。
5. Playwright Chrome 擴充功能端到端測試。
6. 品牌、圖示、四語與官網一致性檢查。
7. 發布版本、最小權限、公開文案、私密路徑與 API Key 掃描。

任何一項失敗都不能發布。

## 手動載入公開版

1. 執行 `pnpm run build`。
2. 在 `chrome://extensions` 載入 `dist/`。
3. 確認版本是 `0.1.0`。
4. 確認 Chrome 權限只有公開版所需的 YouTube、分頁音訊、儲存、Identity 與 Side Panel；不應出現外部 AI 或 Google Drive API 網域。
5. 重新整理原本已開啟的 YouTube 分頁。
6. 播放歌曲並點一次 Karaoke Kaiju 工具列圖示。

## 公開版實機清單

- Key 每次移動一個半音，`+12`／`−12` 邊界正確，速度不連動。
- Fine Pitch、標準／自然人聲模式可切換，沒有爆音或靜音。
- Speed、播放／暫停與前後跳轉正常。
- A、B、啟用、清除、片段保存與練習序列正常。
- 歌單點歌沿用同一分頁，保存參數會套用；依序播放與單曲循環正常。
- LRC／SRT／VTT／TXT 可匯入，歌詞偏移、字體、透明度、位置與雙行顯示正常。
- Chrome Sync 開啟、關閉與容量提示誠實顯示。
- 繁中、English、日本語、简体中文及亮／暗主題沒有溢位或缺字。
- 設定頁看不到未開放研究功能。

## 開發建置

```bash
pnpm run build:development
```

開發建置會顯示尚未公開的研究模組並加入其選用網域，僅供本機開發。不得把這個 `dist/` 上傳 Chrome Web Store、GitHub Release 或交付公開測試者。

每項新功能都必須先在測試或檢查腳本定義預期結果，再修改程式；詳細規則見 [DEVELOPMENT_PROTOCOL.md](DEVELOPMENT_PROTOCOL.md)。
