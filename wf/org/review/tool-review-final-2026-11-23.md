# aos 驗證工具第三次審查

結論：通過。本次僅確認前次兩項 P1 的修正，以及修正是否引入新阻擋；未發現此範圍內的阻擋問題。僅讀程式，未執行工具、Node 或測試。

## 已確認修正

- `wf/aos/tools/arena_verify/tool.py:170`：scope 未確認回收或 cleanup_error 非空時會停止迴圈，all 模式記錄 skipped_steps.build；不再啟動下一個 Node 工作。測試本身失敗但清理成功時仍繼續 build，最後 ok 仍為 false。`test_tool.py` 涵蓋 stop 逾時、查詢例外、scope 未回收三種只呼叫一次 Popen 的分支，並有測試失敗但清理成功的對照案例。
- `wf/aos/tools/arena_e2e/runner.py:92`：SIGTERM 現在只設旗標，不會在 Popen 或清理入口非同步拋出例外。`runner.py:16` 預載 cleanup helper，`runner.py:40` 在 Popen 前建立 try/finally，啟動前後均檢查取消，執行中以有界等待輪詢；`runner.py:74` 在 execute 返回前清理，外層 Node 鎖仍包住整段 execute。
- `wf/aos/tools/arena_e2e/cleanup.py:31`：支援 proc 尚未建立的情況，仍嘗試停止已知 scope、確認回收與埠關閉。重複 SIGTERM 在進入 helper 前只設旗標，helper 內則忽略，均不會打斷清理。`test_startup_cancel.py` 涵蓋 Popen 期間設取消旗標、清理時鎖仍持有，以及 Popen 拋 OSError 時以 proc=None 呼叫清理。

各 Python 檔均低於 300 行。SIGKILL、systemd manager 故障、程序刻意離開 cgroup 等不屬於一般 Python 清理可保證的情境，不列為本輪阻擋；相關限制已部分記於工具 README，仍不應將這兩支工具視為 OS 沙箱。實測結果依 dev／qa 回報，本輪未獨立執行驗證。
