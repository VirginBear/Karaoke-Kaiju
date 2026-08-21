# 0.1.0 公開發布資料審計

審計日期：2026-08-21

## 可公開內容

- `src/`：擴充功能原始碼與公開／開發建置政策。
- `public/`：Manifest、四語字典、正式品牌資產、圖示與第三方授權告知。
- `website/`：GitHub Pages 官方介紹網站。
- `scripts/`、`qa/`：可重現的型別、單元、DSP、Chrome E2E、品牌與發布檢查。
- `docs/`：使用、隱私、架構、設計與協作文件；不包含 `docs/private/`。
- `.github/workflows/`：GitHub Pages 與 PR／分支驗收流程。
- `README.md`、`LICENSE`、`package.json`、lockfile 與 TypeScript／Vite 設定。

## 必須只留在本機的內容

以下路徑由 `.gitignore` 與 `scripts/release-check.mjs` 雙重保護：

- `.env*`（只有空白範例 `.env.example` 可公開）。
- `docs/private/`：未公開研究、個人筆記與內部路線。
- `design/`、`docs/brand-concepts/*.png`：舊版生成概念與介面快照。
- `local_output/`、`model-cache/`、`test-fixtures/private/`：本機 AI 模型、輸出與非公開測試素材。
- `dist/`、`release/`：可重建的發布產物。
- `.DS_Store`、logs、coverage、Playwright 報告與測試結果。
- API Key、OAuth Client ID、Token、憑證、資料庫與個人資料。

舊版設計 PNG 曾存在於 Git 歷史，但不含 API Key 或個人資料；0.1.0 起已停止追蹤。除非未來需要大幅縮小整個 Git 歷史，否則不進行破壞性的 history rewrite。

> 可見性提醒：這是公開 repository，推送到 `main`、`develop` 或其他遠端分支的原始碼都可被外部讀取。Release Channel 只控制公開建置的權限、介面與執行能力，不是保密邊界；真正不能公開的資料只能留在忽略路徑，或另用私人 repository 管理。

## 公開版權限

0.1.0 正式建置只保留：

- `activeTab`、`scripting`、`tabCapture`、`offscreen`、`sidePanel`。
- `storage`、`unlimitedStorage`、`identity`、`identity.email`。
- YouTube、YouTube Music 與行動版 YouTube 頁面。

公開 `dist/manifest.json` 不含 `oauth2`、`optional_host_permissions` 或 Googlevideo 串流網域。研究功能的介面與後端命令在公開建置都停用。

Manifest 的 `key` 是 Chrome 擴充功能公開金鑰，用於維持本機測試 Extension ID，並不是私密簽章金鑰。

## 自動阻擋條件

`pnpm run check`／GitHub Actions 會在發布前阻擋：

- 版本不一致。
- 公開版出現 OAuth、實驗網域或未開放 UI。
- 可提交檔案中出現常見 API Key／Token／私鑰模式。
- `.env`、憑證、資料庫、私密研究或建置產物進入可提交清單。
- 品牌、圖示、四語或官網版本不一致。
- TypeScript、單元測試、DSP 精度、Chrome E2E 或封裝失敗。

## 相依套件與體積

- 2026-08-21 `pnpm audit`：沒有已知漏洞。
- 正式建置約 688 KB；Chrome Web Store ZIP 約 0.2 MB。
- 生產相依套件為 SoundTouchJS（MPL-2.0）、Lucide（ISC）、React／React DOM（MIT）；發布包包含 `THIRD_PARTY_NOTICES.txt`。
- QA 的 440 Hz WAV 約 0.86 MB，只存在原始碼測試，不進入發布 ZIP。
