# arena_verify

供 dev 逐塊驗證核心測試與建置；不跑 E2E 或啟動伺服器。

## 使用

以 `self_tools` 加入此目錄後呼叫 `arena_verify {}`。參數與預設：

- `log_dir`：`/tmp/aos/arena_cheater/dev/verify/`，每次另建 `verify-*` 子目錄；解析符號連結後必須位於 `/tmp/aos/arena_cheater/` 內，否則以 ArgumentsBad 拒絕且不建立目錄。
- `step`：`all`，亦可指定 `test` 或 `build`。
- `timeout_s`：300，每一步的上限，允許 1 至 300 秒。
- `lock_timeout_s`：120，等鎖上限，允許 1 至 180 秒。

從工具所在專案根目錄依序執行 `npm test`、`npm run build`。以 Python `fcntl.flock` 取得 `/tmp/aos/arena_cheater/locks/node.lock` 的獨佔鎖，與 shell 的 `flock` 共用同一 advisory lock；整段執行保有鎖。即使 test 失敗，只要清理已確認成功，all 模式仍執行 build。若 scope_cleaned=false 或 cleanup_error 非空，立即停止後續步驟；頂層 skipped_steps.build 記錄 reason=previous_step_cleanup_failed 與 after=test，不啟動 build。

## 結果契約

回傳 JSON，請讀 `ok`，不要把工具本身 exit 0 當作驗證成功。

每一步包含 `command`、`exit_code`、`timed_out`、`duration_seconds`、`log_path`。測試另含 `test_files`、`test_cases`（Vitest 摘要括號內總數，未找到為 null，不猜成 0）。頂層包含總耗時與等鎖耗時；等鎖超時或 I/O 錯誤以 `error` 回報，`ok` 為 false。命令無法啟動時 exit_code 為 null，附 error。

每一步由 `systemd-run --user --scope --collect` 執行，unit 名稱為 `arena-verify-<步驟>-<UUID>.scope`，寫入 JSON 的 `unit`；完整包裝指令在 `scope_command`。函式內常數 `MEMORY_MAX="4G"`、`CPU_QUOTA="400%"`、`TASKS_MAX="256"` 對應 MemoryMax、CPUQuota、TasksMax。scope 在最外層 flock 鎖內建立，systemd-run 不可用時直接失敗，絕不無限制降級。

正常完成、timeout 或命令錯誤都會呼叫 `systemctl --user stop <unit>` 並查詢 scope 是否已回收；`scope_cleaned` 必須為 true 才可能 ok。已自然結束且被 collect 的 scope，stop 可回 5，隨後 LoadState=not-found 才是清理成功的判準。timeout 先停止整個 scope，再回收 launcher；exit_code 保留 wait 的實際值，另以 timed_out 標示。清理錯誤寫入 cleanup_error，不假稱成功。SIGTERM handler 只設取消旗標，執行中以最多 0.1 秒輪詢進入清理；取消後不再啟動下一步，JSON 包含 cancelled=true、ok=false，並恢復原 handler。stop、launcher 終止與 reap、scope 查詢以巢狀 finally 隔開，各階段失敗仍嘗試後續清理，直到完成清理嘗試才放鎖。正常完成／例外都會放鎖。meta timeout_ms 設為 900000，涵蓋最長 180 秒等鎖、兩步各 300 秒與清理等待。

## 限制

flock 是任務互斥，不是單一 Node 程序的限制；其他任務必須配合同一把鎖。scope 對本步驟全部子程序施加資源配額，但不是檔案沙箱，也不防同 uid 惡意移出 cgroup。log 目錄限制是解析路徑檢查，不是防惡意同 uid 並行置換符號連結的沙箱；命令固定，沒有任意命令參數，但 npm scripts 本身能執行專案設定的程式。Vitest 摘要格式改變可能令數量回報 null。外層 SIGKILL、systemd manager 故障、程序刻意移出 cgroup 或核心不可中斷等待，不在一般清理保證內；工具會盡力 stop 並明確回報失敗，不宣稱絕對無孤兒保證。

## 開發驗證

以 `PYTHONDONTWRITEBYTECODE=1 python3 wf/aos/tools/arena_verify/test_tool.py` 執行不啟動 Node 的 mock 回歸測試：stop timeout、scope 查詢例外、scope 未回收都不得啟動 build；測試退出 7 但清理成功仍應啟動 build。

用 tools_def check 重新編譯 metadata 與 schema；其 sample 會真的執行所指定的驗證並持鎖。失敗分支可指定 timeout_s=1，確認 timed_out=true、ok=false、scope_cleaned=true，毋須修改專案檔案或引入任意命令參數。配額驗證可在持同一把鎖的探測 scope 中讀 /proc/self/cgroup，並從 systemctl show 核對 MemoryMax=4294967296、CPUQuotaPerSecUSec=4s、TasksMax=256；結束後 list-units arena-verify-* 應為空。
