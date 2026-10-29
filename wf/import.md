# 工作流導入記錄

[INDEX](INDEX.md)

2026-10-29 依使用者要求，由 `/mnt/c/code/mine/workflows` 非侵入式導入 kernel v0.6＋dev；來源 Git revision 為 `368468a`，讀取時工作樹乾淨。流程依來源 `IMPORT.md` 與 `docs/non-invasive-import.md`。

## 佈局與適配

根目錄保留 `AGENTS.md`、`CLAUDE.md` 與 `.claude/commands/`；其餘工作流、活狀態及工具收進 `wf/`。未安裝額外 skills 或其他 flavor。Codex 使用 AGENTS 入口，Claude 轉址與 slash command 沿用模板。

來源腳本是 CRLF。導入時以暫存副本轉 LF，再執行 `wf-init.sh --target /mnt/c/code/mine/arena_cheater --flavor dev --non-invasive wf --quiet`；來源 repo 未修改。`--quiet` 避免初始化腳本自動跑 lint，符合導入文件的預設不跑 lint 規則。

佔位內容依本專案實況填寫：只有文件、尚無遊戲程式及 npm 指令；分支慣例未指定，時區 Asia/Taipei。未建立空的程式目錄，也未將未定案技術寫成已安裝環境。使用者後續提供 GitHub URL，經 API 確認遠端為空 repo；於本機初始化 main 並設定 origin 為 https://github.com/justty32/arena_cheater.git，導入當時尚未 commit 或 push。

## mecha-srpg 的參考範圍

閱讀來源 `/mnt/c/code/mine/mecha-srpg` 的 AGENTS、README、PROJECT、SPEC、package.json，以及工作流內的 conventions、code-map、dev-env 與核心設計入口。

採用薄入口、分層導航、需求與實作狀態分開記錄的方式；邏輯與 DOM 分離、無瀏覽器測試作為技術提案。未搬入其程式碼、素材、歷史、團隊規範、套件或權限設定。

## 維護

本次為複製後獨立維護，沒有 symlink 或對來源目錄的執行期依賴。更新 kernel 前先比對來源 CHANGELOG；專案化的入口、偏好、環境與規劃不得整檔覆蓋。原始模板授權為 CC0；未引入額外 skills。

## 本輪驗證

34 份 Markdown 無未填佔位或導入註記，223 個相對連結目標均存在；兩支匯入 shell 工具通過 Bash 語法檢查。未執行選用 wf-lint；遊戲測試與建置不適用，因目前尚無遊戲程式。
