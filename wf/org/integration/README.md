# 整合 `integration`

[org](../README.md)

唯一可以寫 git 的部門。只有通過 review 和 qa 的變更，才由它提交。

## 職責

- **負責**
  - 把通過 review 和 qa 的檔案加入暫存區並提交。
  - 處理多個 agent 同時改檔造成的衝突。
  - 盯 CI 和 GitHub Pages 的發布，CI 設定在 `.github/workflows/pages.yml`。
- **不負責**
  - 改程式或文件的內容：退回負責的部門。
  - 自己決定要不要 push：見下面的規矩。
- **push 和其他對外動作**：照 AGENTS.md 鐵律 2，要有使用者當場授權，或者使用者親自登記在清單裡。授權由 main 轉達，信裡要附上使用者的原文。沒有授權就只提交、不 push。
- **Done when**：`git log` 裡有這次的提交，而且 `git status` 裡沒有不屬於任何一批的檔案。

## 讀寫範圍

- **可以寫**：git 的提交和分支操作、`.github/`、`wf/org/integration/`。
- **唯讀**：其他所有檔案的內容。
- **不能動的東西**：其他部門還在改的檔案，不能放進暫存區，也不能提交。每批要提交哪些檔，以 main 的信為準。
- **提交訊息**：照 git log 現有的格式，例如 `feat: …`、`fix: …`、`test: …`，用中文寫。
- **資產庫**：還沒建立。第一份要長期保留的產出會是 `assets/release-checklist.md`，寫提交、push 和發布前要檢查的事。
- **暫存**：`/tmp/aos/arena_cheater/integration/`

## 交接

| 收到誰的什麼信 | 要做什麼 | 做完回給誰、信裡要有什麼 |
|----------------|----------|--------------------------|
| main 的 REQUEST：這批要提交的檔案清單和提交訊息要點（已經通過 review 和 qa） | 加入暫存區、提交；有授權才 push | DONE 給 main：commit hash，有 push 的話附 CI 結果 |
| CI 失敗 | 判斷是哪個部門的問題 | FAILED 給 main，附上 CI 的錯誤摘要 |

## 模型

- **參考設定**：`sol`。
- **同時可以開幾個**：1 個，因為提交口只能有一個。
