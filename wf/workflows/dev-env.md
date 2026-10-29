# dev-env — 開發環境與指令

[WORKFLOWS](../WORKFLOWS.md)｜[INDEX](../INDEX.md)

**何時用**：換機、安裝工具、建立遊戲開發環境或查啟動方式。
**何時不用**：驗證方法見 [testing](testing.md)，寫碼慣例見 [conventions](common/conventions.md)。

## 環境與相依

原型使用 Node.js 22.12.0 以上及 npm，版本需求以根目錄 `package.json` 為準。2026-10-29 本機實測 Node v24.19.0、npm 12.1.0，shell 為 zsh，另有 Bash 與 Python 3.12.3 供工作流工具使用；時區 Asia/Taipei。

TypeScript 負責型別檢查，Vite 提供開發伺服器與建置，Vitest 驗證純戰鬥邏輯，Playwright 驗證瀏覽器操作。版本由 `package.json` 精確指定並由 `package-lock.json` 鎖定。遊戲沒有環境變數、金鑰、後端或外部執行期服務。

## 安裝與啟動

在專案根目錄執行：

```sh
npm ci
npm run dev
```

開啟終端顯示的網址，預設為 `http://localhost:5173`。開發伺服器綁定 `0.0.0.0`，實際可達網址依執行環境而定。

```sh
npm run build
npm run preview
```

建置先做型別檢查，再產生 `dist/` 靜態檔案；預覽網址以終端輸出為準。依賴與產物不進版控。

WSL 的 `/mnt/c/` 等掛載資料夾若未觸發熱更新，可停止開發伺服器後用輪詢監看重新啟動：

```sh
CHOKIDAR_USEPOLLING=true npm run dev
```

輪詢只影響開發時的檔案監看，不改變遊戲規則或建置產物。

## 瀏覽器測試環境

首次執行瀏覽器測試前安裝 Chromium：

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright 設定負責測試伺服器與瀏覽器環境。Linux 若回報缺少瀏覽器系統函式庫，依錯誤安裝必要相依，再重跑；可用 `npx playwright install --with-deps chromium` 一併安裝，系統套件安裝可能需要管理員權限。不要把單純的套件下載成功當成瀏覽器已能啟動。

## 工作流工具

`wf/tools/` 的 shell 工具使用 Bash，資料與文件工具使用 Python 3。選用的工作流檢查為 `bash wf/tools/wf-lint.sh --strict .`，僅在使用者要求時執行；遊戲驗證命令集中在 [testing](testing.md)。

## Done when

`npm ci`、`npm run build` 回傳 0，開發伺服器首頁回傳成功 HTTP 狀態；需要瀏覽器驗證的變更另依 testing 執行。環境或腳本改動後，指令與 [code map](common/code-map.md) 必須同步。

## 交接

開始實作走 [feature-dev](feature-dev/README.md)；驗證走 [testing](testing.md)。
