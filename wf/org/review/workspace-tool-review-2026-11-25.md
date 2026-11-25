# arena_verify workspace 審查（2026-11-25）

結論：要求修改（FAILED）。範圍為 `wf/aos/tools/arena_verify/` 的 tool.py、test_tool.py、README.md、_tooldef.json；review 未改作者檔案，也未啟動 Node 或開下屬。

## F01：工具鏈檢查漏掉優先載入的 Vitest 設定（P2）

位置：`wf/aos/tools/arena_verify/tool.py:67`。

只比對 vite.config.ts，沒有排除／核對 vitest.config.ts 等高優先設定。保留五個 anchors 全部逐 byte 相同，在副本新增 `vitest.config.ts`，內容為 `export default { root: "/mnt/c/code/mine/arena_cheater" };`，workspace 檢查仍接受並準備啟動兩步命令。這可由殘留設定導致，不需要並行置換或惡意同 uid；回傳 project 是副本，但 test 實際會以主 repo 為 root，候選變更可能完全未測。

依據：已安裝 Vitest 的 `dist/chunks/constants.-juJ8b_4.js:6` 將 vitest.config 排在 vite.config 之前；`dist/chunks/index.1TqnEahn.js:8683` 的 findConfigFile 取第一個存在檔；`:9241` 起使用該設定。mock 證據只證明工具接受；實際載入結論來自上述靜態實作，未假稱實跑此設定。

建議：檢查實際可自動載入的設定集合及其存在性／內容，至少拒絕副本額外或異動的 vitest.config.*，避免只核對一個未必被使用的設定。補上高優先設定使 root 回到主 repo 的拒絕測試，並讓 README 的工具鏈保證與實作一致。

## F02：只檢查根目錄，來源／測試 symlink 仍可指回主 repo（P2）

位置：`wf/aos/tools/arena_verify/tool.py:71`。

layout 只用 is_dir，會跟隨 symlink。副本根目錄合法、anchors 相同，但把 `src/arena` symlink 到主 repo 的 `src/arena`，檢查仍接受。候選製作流程若透過此目錄寫 JSON／來源，會直接改主工作樹；驗證也會讀主 repo 來源。這違反本批「隔離副本，不必改工作樹」的防誤用目的，而非要求抵禦惡意同 uid。同樣風險存在於 tests 和內層來源檔 symlink；僅限制 workspace 本身 resolve 不足。

建議：對需隔離的來源／測試樹核對實際路徑，拒絕逃出 workspace 的目錄或檔案 symlink；保留 node_modules 共享的明確例外。補上 src/arena、tests/simulation 及內層來源檔指回主 repo 的拒絕案例。實跑時可加入只存在副本的 sentinel 測試，確認候選確實被載入且主 repo 沒有變動。

## 已確認部分

預設／空 workspace 的 project、固定 test/build 命令、全機 node.lock、systemd scope、4G／400%／256 配額與 cleanup gate 均未改變。根目錄的越界、近似前綴與 symlink 逃逸使用 resolve 加 is_relative_to，既有 mock 可擋下。未發現本批預設路徑或 cleanup gate 回歸。五個 anchors 的 byte 比對符合目前明訂契約，對不同版本工具鏈的拒絕屬預期。

單獨共享 node_modules 不會自行把 cwd 或相對來源 import 改回主 repo；Vitest 預設從 process.cwd 找設定，Vite 預設 root 亦為 cwd，套件位置不是來源 root。作者 smoke-copy 的 src/tests 無 symlink，test log 顯示副本 root、23 檔 206 案通過，build log 成功。但該副本與主 repo 來源相同，不能用這份綠燈代替候選載入的差異證明。

## 證據與限制

`/tmp/aos/arena_cheater/review/workspace-review/check.py` 重跑原六個 mock 測試，並重現 F01/F02 都通過 workspace 檢查；輸出在同目錄 check.log、evidence.json。為守寫入範圍，測試在記憶體將 dev 暫存路徑及 lock 檔轉到 review 暫存；Popen／subprocess.run 均 mock，未執行 systemd 或 Node，未更動全機鎖。作者實跑 log 親讀於 `/tmp/aos/arena_cheater/dev/workspace-tool/verify/verify-tsh2kt_p/`；scope_cleaned=true 是來信提供，該目錄僅見 test/build log，未獨立重跑 scope 清理。

兩支 Python 分別 204、118 行，未超過 300；git diff --check 通過。本次公告欄 notice.md、wall.md 不存在，已如實記錄，未另建或繞過。修正後需補回歸及候選載入證據，再複審。
