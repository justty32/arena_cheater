# arena_verify workspace 複審（2026-11-25）

結論：要求修改（FAILED）。F01 已修；F02 的直接逃逸已修，但經 workspace 內部目錄 symlink 的二段逃逸仍未封閉。依據 dev 複審信 01795566675230880542.277293.213993；未改作者檔案、未跑 Node、未開下屬。

## F02 續：os.walk 不下鑽合法內部 symlink 目錄（P2）

位置：`wf/aos/tools/arena_verify/tool.py:84`。

目前對 symlink 目錄只檢查當下 resolve 是否留在 project；`os.walk(root)` 預設 followlinks=False，不會掃它指向的目錄內容。因此 `src/arena -> <workspace>/shared-arena` 合法，但 `<workspace>/shared-arena/main.ts -> <主 repo>/src/main.ts` 不會被掃到。所有 anchors／設定集合維持原樣，workspace 仍接受並啟動兩步 mock 命令。實際透過 src/arena/main.ts 讀寫會落回主 repo，F02 原本的隔離風險依然存在。此情境不含並行置換，也不要求防惡意程式。

建議：遞迴檢查目錄 symlink 的實際目標並以已訪問實體路徑／inode 集合防循環，或明確拒絕 src/tests 的目錄 symlink（同時調整 README 契約）。不要只打開 followlinks 而沒有循環保護。補上「內部目錄 symlink 再接外部檔案／目錄 symlink」拒絕案例；保留 node_modules 共享例外。

## 通過部分

F01 的設定集合及 byte 比對已涵蓋 vite.config.*、vitest.config.*、tsconfig*.json，額外高優先設定拒絕案例已補。F02 直接指向主 repo 的 src/arena、tests、內層檔案均已有拒絕回歸。原八個 mock 全數通過；固定命令、全機鎖、scope 配額及 cleanup gate 未見本批回歸。新增 result.json 在 finally 保存清理結果、失敗時 ok=false，未見阻擋問題。

已親讀 `/tmp/aos/arena_cheater/dev/v3-logs/a-reviewed-final/verify-rb9fangc/` 的 test.log、build.log、result.json：副本 A 的 sentinel／candidate-contract／100 局報告三案與 build 均成功，兩步 exit_code=0、scope_cleaned=true、無 cleanup_error。sentinel 原文確實從副本相對匯入 balance，斷言正式來源沒有的 clubBonus=3；這足以補初審要求的副本候選載入證據。這不是正式全套回歸或 V3 數值審查通過的宣告。

## 證據

獨立 mock 重現與原八案輸出：`/tmp/aos/arena_cheater/review/workspace-review/recheck.py`、recheck.log、recheck-evidence.json。接受的 src/arena resolve 留在副本，但其 main.ts resolve 是 `/mnt/c/code/mine/arena_cheater/src/main.ts`，launcher 被呼叫兩次。Popen／subprocess.run 均 mock；測試路徑及鎖在記憶體轉到 review 暫存，不動全機鎖或 dev 暫存。git diff --check 通過。公告欄 notice／wall 仍不存在。
