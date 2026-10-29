# dev-env — 開發環境與指令

[WORKFLOWS](../WORKFLOWS.md)｜[INDEX](../INDEX.md)

**何時用**：換機、安裝工具、建立遊戲開發環境或查啟動方式。
**何時不用**：驗證方法見 [testing](testing.md)，寫碼慣例見 [conventions](common/conventions.md)。

## 目前實況

專案根為 `/mnt/c/code/mine/arena_cheater`，目前只有文件與工作流，沒有 `package.json`、lockfile、遊戲程式或建置設定。因此目前沒有安裝、遊戲啟動、build、型別檢查或遊戲測試指令。

2026-10-29 本次 shell 為 zsh，可用 Bash、Python 3.12.3、Node v24.19.0 及 npm。這是本機觀察值，不是已確定的遊戲版本需求。時區 Asia/Taipei。沒有專案環境變數、金鑰或外部服務。

## 流程

1. 在專案根閱讀 [PROJECT](../../PROJECT.md) 與 [planning](planning.md)，辨別已確認需求和技術提案。
2. 文件與工作流可直接編輯，不需要先安裝遊戲依賴。
3. 實作階段選定工具後，建立套件設定與 lockfile，再把經實測的安裝、啟動、建置指令補入本檔；同步 [testing](testing.md) 與 [code map](common/code-map.md)。

## 工作流工具

| 工具 | 用途 | 條件 |
|------|------|------|
| Bash | 執行 `wf/tools/*.sh` | 本機已存在；匯入腳本為 LF |
| Python 3 | `wf/tools/tabledb.py` 等資料工具 | 本機已存在；需求依工具的 `--help` 查詢 |
| `bash wf/tools/wf-lint.sh --strict .` | 選用工作流檢查 | 在專案根執行；使用者要求時才跑 |

## Done when

本階段只需文件與工具可讀，且未宣稱不存在的遊戲指令可執行。首次加入執行環境後，以實際啟動及建置成功為驗收，版本需求與指令不得從參考專案直接抄成已驗證事實。

## 交接

開始實作走 [feature-dev](feature-dev/README.md)；驗證走 [testing](testing.md)。
