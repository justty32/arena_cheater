# review_move_check

review 的純搬移審查輔助工具。只能讀取專案，不寫入專案檔、不跑 Node，不代替人工審查或 TypeScript 編譯。入口使用 `python3 -B`，不產生 bytecode；正式程式只有 git 唯讀指令與檔案讀取。

## 使用

用 `self_tools` 加入本目錄，呼叫 `review_move_check`。必要參數 `repo` 是專案根目錄；預設 `base=HEAD`、`target=WORKTREE`、`scope=src/arena`。兩端也可傳 commit，例如 `base=692be37^`、`target=692be37`。

`moves` 可傳舊路徑對新路徑的物件；未指定的新增檔，若舊樹只有一個相同 basename，會列成 `inferred_moves`。推測必須人工確認。原路徑留 facade 時，同時回報原路徑與實作路徑，不能只看搬移配對而漏審 facade。

輸出是證據，不提供總體通過旗標：
- `comparisons`：變更檔或搬移配對的原始文字相等性、去靜態 import 並正規化模組字串後的本文、出口名稱提示、import 綁定與解析後引用相等性。
- `graph_before` / `graph_after`：scope 內 TS/TSX/JS 的完整相對引用圖，包含 type-only、字面 dynamic import、內嵌 import 型別及 re-export；循環回報 SCC 群組。
- `added` / `deleted` / `invalid_moves`：不得忽略的新增、刪除及無效明確 mapping。新增 facade 不會被本文相等掩蓋。
- `snapshot_sha256`：依路徑排序的文字快照摘要；WORKTREE 包含 tracked 與未忽略的 untracked 支援類型檔案。

## 限制與人工關卡

這是 Python 詞法掃描，不是 TypeScript parser。靜態 import 要以分號結束；不支援的尾部會保留本文並列 warning。去除 import 不表示綁定不變：必須一起看 `import_bindings_equal`、`references_equal`，拆分 import、經 facade 改直接引用也可能合理地回傳 false，需人工核對。

出口集合是名稱提示，不展開 `export *`，不保證多重宣告、解構等語法完整。模板字串整段不分析；regex literal、JSX、模板內引用及計算型 import 必須人工搜尋。dynamic／inline import 只有單一字面字串緊接右括號才列引用；計算式及帶第二參數的 import 保守列 `nonliteral_import` warning、不建立引用邊。re-export 只從緊接 `export [type]` 的 `{ ... } from`、`* [as name] from` 子句取引用，不往後續宣告或下一句搜尋。無 warning 不表示支援所有語法。

相對引用只解析 scope 內檔案，支援常見副檔名和 index.ts/index.tsx；不解析 tsconfig alias、package exports、query suffix。外部套件不驗存在性；scope 外相對引用列 missing。圖包含型別邊，循環不等於 runtime 循環。只保留支援的文字檔，不是完整 repo 稽核。工作樹讀取不是原子快照，並行變更時請穩定後重跑。

## 驗證

`python3 -B -m unittest discover -s wf/aos/tools/review_move_check -v`。測試只在 review 暫存目錄建 fixture；git 回應以 mock 提供，不 commit、不改實際工作樹。

2026-11-24 作者實跑：初版 10 個、獨立審查修正後 13 個單元測試通過（補無分號 export 後接 import、真正 re-export 各型及計算 import）；`tools_def check` stage 3/3；經 `self_tools` 實際呼叫三個歷史批次與 HEAD/WORKTREE。三批搬移配對分別 9、7、17（UI 為 14 TS + 3 CSS），本文／出口／import 綁定均相等，三批新圖皆無循環、缺失或 warning；4a 消費端的 import 拆分、facade 改直接引用刻意保留不相等供人工核對。HEAD/WORKTREE 的 src/arena 摘要相同。原始報告與測試 log 在 `/tmp/aos/arena_cheater/review/move-check/`；暫存不是長期資產。

kb 初次獨立審查發現無分號 export 誤抓後續 import 的 re-export 邊，作者已修並補測，三批歷史完整報告逐物件等於修前結果；證據在同一暫存目錄的 `*-reexport-fix.json`。等待 kb 複審，未寫入 agent 定義；由 main 依 aos 工具批次安排。
