# Karaoke Kaiju 公開發布待辦

## 跨平台相容性

- [x] 建立同一份公開 `dist/` 在 macOS／Windows Chrome for Testing 執行的端到端驗收命令。
- [x] macOS ARM64、Chrome for Testing stable 通過 Key、Speed、A–B、歌詞、歌單與同步 smoke test。
- [x] GitHub `windows-latest` 與 `macos-latest` 均以 Chrome for Testing 152 通過完整擴充功能 smoke test。
- [ ] 在一台 Windows Google Chrome Stable 116+ 人工載入 `dist/`，完成 YouTube／YouTube Music 聽感與切歌測試。
- [ ] 發布前在日常 macOS Google Chrome Stable 人工載入最終 ZIP，再跑一次公開版清單。
- [ ] iPad Orion 加入 API feature detection；缺少 `sidePanel`／`tabCapture`／`offscreen` 時不得崩潰或顯示假啟動。
- [ ] 研究 Orion `sidebarAction` 介面降級，但在找到可驗證的 iPadOS 分頁音訊方案前，不宣稱支援升降 Key。
- [ ] 實體 iPad 記錄 iPadOS／Orion 版本、安裝方式、API 錯誤、音高輸出與背景穩定性。

## 0.1.0 公開測試版

- [x] 品牌名稱、方形怪獸歌手圖示、擴充功能與官網一致。
- [x] `package.json`、Manifest 與官網升為 0.1.0。
- [x] 公開／開發建置使用同一程式碼與明確功能政策。
- [x] 公開版隱藏未完成驗收的研究功能與外部 API 網域。
- [x] 加入版本、權限、機密、私密路徑與公開文案自動檢查。
- [x] 加入 GitHub Actions PR／分支驗收與測試封包。
- [ ] 合併發布 PR 後，在日常 Chrome 載入最終 `dist/` 實測 YouTube 與 YouTube Music。
- [ ] 邀請第一批測試者依 [TESTING.md](docs/TESTING.md) 回報裝置、Chrome 版本、歌曲 URL 與重現步驟。
- [ ] 準備 Chrome Web Store 宣傳圖、公開隱私政策網址與支援信箱。
- [ ] 商店審核通過後，在官網加入正式安裝按鈕。

未納入公開發布包的研究程式可在 `develop` 分支繼續驗證；內部計畫、模型、測試素材與個人筆記只保存在本機 `docs/private/` 等忽略路徑。公開 GitHub repository 的任何遠端分支都能被外部看見，因此「公開版隱藏功能」不等於「原始碼保密」。
