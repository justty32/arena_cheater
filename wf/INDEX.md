# INDEX — arena_cheater 專案地圖

奇幻類自走棋，主要看點為場邊作弊；目前為工作流與需求初始化階段。

## 專案入口

| 路徑 | 內容 |
|------|------|
| [README.md](../README.md) | 人的入口與目前可用內容 |
| [PROJECT.md](../PROJECT.md) | 原始需求、定位及尚未定案的玩法／技術提案 |
| [AGENTS.md](../AGENTS.md) | Agent 薄入口 |
| [CLAUDE.md](../CLAUDE.md) | Claude Code 轉址 |
| `.gitattributes`／`.gitignore` | LF 換行設定與本機環境／工具快取排除 |
| `.claude/commands/` | 根目錄的 Claude Code 指令適配層 |
| `wf/tools/` | 自帶工作流檢查與資料檔工具；不屬於遊戲程式 |

## 工作流入口

| 檔案 | 角色 |
|------|------|
| [WORKFLOWS.md](WORKFLOWS.md) | 意圖 → 工作流派發器 |
| [common/README.md](workflows/common/README.md) | 共用慣例與使用者資訊 |
| [planning.md](workflows/planning.md) | 想法、下一階段與規格落點 |
| [STRUCTURE.md](STRUCTURE.md) | 結構整理參考 |
| [SESSION-LOG.md](SESSION-LOG.md) | 只列進行中工作 |
| [WAIT_USER.md](WAIT_USER.md) | 只列必須由使用者處理的阻礙 |
| [import.md](import.md) | 導入來源、版本與適配範圍 |

尚無 `src/`、遊戲內容、測試或建置設定；實作落地時再建立目錄並更新 [code map](workflows/common/code-map.md)。
