# aos 驗證工具審查

審查範圍：`wf/aos/tools/arena_verify/`、`wf/aos/tools/arena_e2e/` 的工作區版本。僅讀程式，未執行工具、Node 或測試。結論：FAILED，三項阻擋問題、一項權限建議。Python 檔案均未超過 300 行。

## 阻擋一：清理命令失敗會跳過其餘清理（P1）

`arena_e2e/runner.py:55` — `finally` 最先執行的 `systemctl stop` 沒有自身的例外保護。它若逾時或無法啟動，後續 process group 的 TERM/KILL、wait、scope 與埠檢查全部不執行。外層只將結果改成 BLOCKED，隨即離開鎖的 with；此時 launcher／Node／Vite／Chromium 可能還在跑，下一件拿鎖的工作便可能與殘留工作並行。這正是 scope 清理失敗時最需要 fallback 的分支。

建議：將 stop、process-group 終止及 reap、scope 狀態確認拆成各自受保護的清理階段，以巢狀 finally 保證前一步報錯仍嘗試後續步驟；保留各階段錯誤，清理不能確認時不得宣稱成功。所有清理嘗試仍須放在 Node 鎖內。

## 阻擋二：SIGTERM 不會走 Python finally（P1）

`arena_verify/tool.py:94`、`arena_e2e/runner.py:33` — 兩支工具都用 `start_new_session=True` 啟動 launcher，卻未處理父 Python 程序收到的 SIGTERM。Python 的預設 SIGTERM 動作直接終止程序，不會執行 finally；鎖的 fd 隨父程序死亡而釋放，但獨立 session／scope 的工作可能繼續跑。工具 metadata 還標示 `interrupt: safe`。arena_verify README 只排除 SIGKILL 等極端情境，並未排除一般 SIGTERM。aos 的 `fn_run.py` 僅為 SIGINT 設定 SystemExit handler，沒有代為處理 SIGTERM。

建議：為一般終止訊號設置可進入既有清理流程的取消處理，並保證清理完成前保有鎖；不要在 signal handler 內直接執行複雜 subprocess 清理。若無法提供此保證，需調整 interrupt 契約並明確界定取消行為，而非標示 safe。

## 阻擋三：無法查詢 scope 也可能回 DONE（P2）

`arena_e2e/runner.py:72` — 清理後忽略 `systemctl show` 的 returncode，只排除 ActiveState=active／activating。若 user manager 查詢失敗而 stdout 為空，或 scope 仍為 deactivating，程式會當作清理完成；只要測試退出碼為 0 且結果有案例，就可能回 DONE。埠已關閉不能證明 Chromium 或其他非伺服器程序已回收。這與 README 所承諾的 inactive/not-found 判準不同。

建議：明確確認 LoadState=not-found，或已知有效查詢下的 inactive 且沒有剩餘任務；對 deactivating 做有上限的等待。未知／空白狀態和查詢失敗須記為 cleanup failure，不得以埠關閉替代 scope 清理成功。

## 建議：log_dir 是未受限的寫入位置

`arena_verify/tool.py:60` — 呼叫者可提供任意可寫路徑，工具會 resolve 後 mkdir 並建立 verify-* 目錄，因此可把 log 寫進工作區甚至 `.git`。這是 README 已揭露的設計限制，不是任意命令注入；目前參數也不會直接覆寫任意指定檔案。建議將位置限制在 `/tmp/aos/arena_cheater/dev/verify/` 的解析後子路徑，或移除 log_dir 參數；若要保留，請 main 確認這項寫入權限確為預期。

## 其餘核對

arena_verify 的總 ok 使用所有步驟的退出碼、timed_out 與 scope_cleaned，test 失敗不會被成功 build 蓋過。兩支工具均固定 npm 指令，systemd-run 不可用時沒有無限制 fallback。arena_e2e 的來源參數不直接指定目的路徑；commit 經 rev-parse 後才交 git archive，UUID 目的目錄拒絕覆用，tar 使用 data filter，baseline 亦檢查 resolve 後的 qa 目錄邊界。專案來源與 node_modules 不是 sandbox 已在 README 揭露。本次沒有發現一般參數能把 commit 副本目的地改成工作區或 `.git` 的路徑。
