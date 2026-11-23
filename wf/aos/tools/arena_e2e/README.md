# arena_e2e

固定專案 `/mnt/c/code/mine/arena_cheater` 的 E2E runner；輸出只放 `/tmp/aos/arena_cheater/qa/e2e-<uuid>/`。

## 使用

`arena_e2e({"source":"64a7e87"})` 驗 commit；`source: "workspace"` 驗當前工作區。可提供先前成功的 `result.json` 作 `baseline`，或設 `preflight_only: true` 只檢查環境。預檢不啟動 Node，不跑測試；預檢 DONE 不等於測試通過。

結果含 status、source_hash、exit_code、started_at、ended_at、duration_s、passed、failed、skipped、failure_stage、cases 及 artifacts。workspace 另外提供內容指紋。環境、啟動、零案例及工具錯誤報 BLOCKED；案例失敗或與基準案例集合／狀態不同報 FAILED。exit_code 為測試命令退出碼；預檢或命令未啟動時是 null。

## 執行方式

先檢查 Git 來源、npm/node 是否存在、專案 Playwright 依賴及快取 Chromium 的 ldd。Node 鎖位於 `/tmp/aos/arena_cheater/locks/node.lock`，等待上限 300 秒，測試命令上限 420 秒；工具 timeout_ms 為 900000。鎖涵蓋快照、測試命令和 scope/process group 清理。Node 是一個任務樹，不是只有一個 OS 程序。

命令使用唯一 systemd user scope，常數為 `MEMORY_MAX='4G'`、`CPU_QUOTA='400%'`、`TASKS_MAX=256`。啟動後用 systemctl show 核對 MemoryMax=4294967296、CPUQuotaPerSecUSec=4s、TasksMax=256；無法建立或驗證 scope 就 BLOCKED，絕不退回無限制執行。finally 一律呼叫 systemctl stop，再確認 unit 不再 active 且埠關閉；--collect 可能已先回收 unit，此時 stop 的 not loaded 訊息會保留在 JSON，inactive/not-found 才視為已清理。scope unit、限制、屬性與清理結果均回傳。

commit 用 git archive 建立全新 UUID 目錄，目的地存在即拒絕；依賴連到原工作區。臨時 Playwright config 保留專案設定，強制不重用伺服器、指定輸出目錄及 JSON reporter。配置 loopback 動態埠，若埠被搶先占用，由 strictPort 拒絕啟動，不連到其他伺服器。Rayon thread pool 限為 2，以降低 Vite/Rolldown 的執行緒需求。

## 已知限制

- 不是 sandbox。來源 commit 及 workspace 的測試、Vite config、npm scripts 都會執行程式，僅限可信專案來源。不得把它當成惡意代理的 OS 寫入限制。
- node_modules 符號連結不是唯讀或隔離；依賴版本取自目前工作區，不保證與舊 commit 鎖檔相同。
- workspace 執行期間須由協調者凍結檔案；指紋只描述執行前內容，沒有鎖住檔案。
- flock 是合作式鎖；不拿鎖的外部命令仍可並行。systemd scope 限制任務樹資源，並非檔案／網路 sandbox，也不防同 uid 蓄意移出 cgroup。
- 動態埠在配置後到 Vite bind 前仍有競爭窗口，但不允許重用既有伺服器。
- ldd 檢查快取內所有對應 headless shell，可能因未使用的舊版本缺依賴而保守拒絕；不是完整 Chromium smoke test。
- 零案例時的基準差異只表示無結果，不代表測試真的被移除。名稱比對適用本專案，尚不處理同名案例碰撞及版本化報表遷移。
- 受限子代理的記憶體／程序限制可能讓 Node 或 Rolldown 在測試前中止；遇到此情況回 BLOCKED，不自動放寬限制。

## 取消與清理契約

SIGTERM handler 只設取消旗標，不非同步拋例外；執行前、啟動後及最長 0.2 秒的命令等待輪詢會檢查旗標（systemctl 查詢另有 10 秒上限）。cleanup helper 在啟動前載入，Popen 本身也在清理 try 內，即使啟動取消或失敗仍清理已知 scope；鎖內清理完成才回 BLOCKED。清理期間暫時忽略重複 SIGTERM，完成後恢復 handler。stop、process group TERM/KILL、reap、scope 查詢、埠檢查各自保護，前一階段錯誤不跳過後續階段；任何清理階段異常均記 cleanup_errors 並回 BLOCKED。

只有 systemctl show exit 0 且 LoadState=not-found、ActiveState=inactive 才確認已回收。deactivating 或未知狀態會有限等待後失敗，不以埠關閉替代 scope 確認。SIGKILL、OS 崩潰仍無法保證由 Python 清理。可用 `python3 wf/aos/tools/arena_e2e/test_cleanup.py` 跑不啟動 Node 的故障注入測試。

## 第二輪驗證

tools_def check 使用 preflight_only，不會暗中啟動 E2E。實跑結果及權限探測詳見 `/tmp/aos/arena_cheater/qa/retro-2-notes.md`。本輪未改專案測試及設定。
