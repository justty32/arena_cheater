# aos 驗證工具複審

範圍：`wf/aos/tools/arena_verify/`、`wf/aos/tools/arena_e2e/` 工作區版本。依要求僅讀程式，未執行工具、Node 或故障測試。結論：FAILED，尚有兩項阻擋問題。

## 阻擋 P1：arena_e2e 取消處理仍有跳過清理的區段

`arena_e2e/runner.py:33` — SIGTERM handler 現在直接拋 RuntimeError，但 Popen 仍位於負責清理的 try/finally 外。若 SIGTERM 發生在子程序已建立、Popen 尚未回傳，或已回傳但尚未進入 try 的時候，execute 會直接退出而不呼叫 cleanup，外層隨即離開 Node 鎖。新 session 中的 systemd-run／Node 可能繼續跑。

此外 `arena_e2e/runner.py:55` 到 cleanup.py 安裝 SIG_IGN 之前，清理模組的 import 與載入仍會被第二個 SIGTERM 的 RuntimeError 中斷，跳過全部實際清理。因此目前「清理期間忽略重複 SIGTERM」只保護 helper 內部，沒有保護進入 helper 前的區段。

建議：改用不會在任意 Python 指令點拋出的取消旗標，再以有上限的等待輪詢進入清理；在啟動子程序之前就建立完整的資源清理邊界，清理模組也應預先載入。必須讓啟動中取消與清理入口收到重複 SIGTERM 均能完成鎖內清理。新增測試應覆蓋 execute 的啟動／清理入口，而不只直接呼叫 cleanup helper。

## 阻擋 P1：arena_verify 清理失敗後仍啟動下一個 Node 工作

`arena_verify/tool.py:169` — all 模式在本步驟 scope_cleaned=false 或 cleanup_error 非空時，只記錄結果，仍直接進入下一次迴圈啟動 build。若 stop 逾時、scope 仍有子程序，或 launcher 已退出但 scope 尚存，前一步未確認停止，後一步就會與它並行。最後 ok=false 無法補救執行期間違反單一 Node 工作樹的限制。

建議：保留 test 失敗但「已確認清理完成」時繼續 build 的既有契約；若清理階段失敗或 scope 未確認回收，應中止後續步驟，明確標記其未執行，不能再啟動新工作。補測 stop／scope 查詢失敗時不會呼叫下一步 Popen。

## 前次意見核對

arena_e2e 的 stop 例外已不會跳過 helper 內後續 TERM/KILL、reap、scope 與埠檢查；scope 回收也改為嚴格檢查 returncode=0、LoadState=not-found、ActiveState=inactive。新增 test_cleanup.py 會驗證 stop timeout 後繼續清理，以及拒絕未知／deactivating 狀態，但沒有涵蓋上述 execute 入口區段。

arena_verify 的 SIGTERM 改為旗標，正常執行中取消會在鎖內完成清理且不再進入下一次迴圈；清理例外也分階段保護。log_dir 解析後限制在 /tmp/aos/arena_cheater/ 內，已消除一般參數把 log 寫入工作區或 .git 的問題。這比前次建議的 dev 專屬目錄寬，但符合本次來信描述的修法；同 uid 惡意置換符號連結仍是 README 明列的非沙箱限制。

各 Python 檔均低於 300 行，未發現 systemd 不可用時無限制降級，亦未發現前一步失敗被後一步成功覆蓋成 ok。
