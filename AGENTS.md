# 調唱專案協作規範

所有工程師與 AI 協作者都必須遵循 [docs/DEVELOPMENT_PROTOCOL.md](docs/DEVELOPMENT_PROTOCOL.md)。

開始工作前：

1. 閱讀 `docs/PROJECT_SPEC.md`、`TODO.md` 與最新的 `docs/DEVELOPMENT_LOG.md`。
2. 先確認目前 `package.json` 版本與 `public/manifest.json` 是否一致。
3. 找出要驗證的使用者流程與失敗情境。

完成工作前：

1. 不在程式碼、測試、文件或發布包放入任何 API Key 或個人資料。
2. 不用隨機值或假成功訊息冒充演算法。
3. 執行型別檢查、單元測試、正式建置與相關瀏覽器驗收。
4. 更新 `TODO.md`、`docs/TESTING.md` 與 `docs/DEVELOPMENT_LOG.md`，只標記已被證明的功能。
5. 回覆變更檔案、驗證命令、結果、未完成風險與下一步。
