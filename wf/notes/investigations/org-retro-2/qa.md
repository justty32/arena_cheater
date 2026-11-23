# qa 第二輪回顧：工具、下屬權限與資源

## 1. 做工具的過程

固定流程變成 arena_e2e 很值得：來源、副本、預檢、Node 鎖、動態埠、JSON 報表、比對與產物位置都有共同入口，不必每次重新拼命令。tools_def 的骨架、check、self_tools 註冊一路順暢。check sample 用 preflight_only，不會為了驗工具定義偷偷跑一次完整瀏覽器測試。

真正卡的是生命週期，不是測試命令。第一次 review 指出 stop 失敗會跳過 fallback、SIGTERM 不進 finally、空白 scope 查詢可能誤判成功；第二次又抓到 Popen 在 try 外、handler 非同步拋例外、cleanup 模組載入期間的取消窗口。這些是我的設計漏想，不應歸咎審查標準臨時增加：既然承諾一般取消會清理且清理前保鎖，就必須覆蓋啟動、等待、清理的整段生命週期。

後來改成 handler 只設取消旗標、有上限的輪詢、helper 預載、Popen 進 try/finally；各清理階段獨立保護。未知 scope 狀態不得當成功。正常 E2E、真實執行中 SIGTERM、啟動取消 mock、stop timeout mock 各驗不同契約，不能只靠一次 20 案綠燈宣稱 runner 安全。最後版本指定 commit 20/0/0，68.620 秒；4 個非 Node 故障測試通過。

流程可改進之處是先列 runner 的失敗矩陣：啟動前取消、啟動中取消、查詢失敗、stop 逾時、重複終止、清理不明、OOM。先和 review 對齊哪些一定要驗，再實作，應能少一輪退件。不是把 review 當共同寫手，而是先把承諾轉成可驗的契約。

## 2. 受限下屬實證及解讀

取消 B 的信在我下一次讀信前已到；當時仍沿舊請求做完並收掉下屬。實證保留，不代表固定流程還需要 agent。以後長任務每個階段交界應讀信，避免取消指令在信箱等整段工作跑完。

只開一個 qa-e2e-kid，後改 terra；預設 template 首次回 FAKE ANSWER，不算工具執行證據。刪掉一般執行、寫入、JSON 寫入、self_tools 及 mailbox_send 等入口後，子代理實際回報 write 與 self_tools 不存在，沒有呼叫它們。這證明可用工具入口縮小，不是證明 OS 拒絕任意寫檔或無法恢復權限。沒有做惡意逃逸，也不應用合作式探測推論對抗安全。

read 實際讀到 kid-ws 外、qa/probe 內的授權假資料，證明 workspace 只是預設位置，不是 ACL。探測沒有讀專案機密、其他 stack 或 AOS_HOME。下屬已 rm(purge=false)，stack 留供授權工具稽核。

### rlimit 與 cgroup

需要先修正因果描述：這輪在下屬 mem_mb=2048、files=512 的情境觀察到 Rolldown EAGAIN；調小 Rayon pool 後仍 abort。父代理在 4G scope 下正常，但模型、父子執行環境及限制都不同，並不是在同一個下屬上只改一個變因的實驗。因此不能斷言「mem_mb=2048 就是原因」，也不能斷言換成 4G 必定治好。這需要獨立調查授權及紀錄有效限制、cgroup 事件、實際使用量。

依 eca-aos 的事實回答，rlimit 的 mem_mb 等鍵是每程序限制，並非整棵任務樹共用總額；也不能把位址空間等限制直接等同實際 RSS。Node/V8、原生 thread pool、Chromium 多程序可能對這些限制有不同反應；EAGAIN 本身不足以判定 OOM。

cgroup 的 MemoryMax、CPUQuota、TasksMax 比較貼近「這件工作總共可以用多少」：連同 Vite 與 Chromium 計算，且可用 unit 一起停止。這輪實際 show 驗到 4294967296、4s、256，正常測試跑完，沒有觀察到 OOM。但目前沒記 MemoryPeak、memory.events 或限流量，資源是否緊繃仍未知。cgroup 也不防同 uid 的蓄意移動或修改，不能當作 hostile agent sandbox。

### 判斷型下屬的設計

分析失敗需要讀取，不先需要執行：給它這次 result/report、stdout/stderr、截圖／trace 摘要及必要測試、原始碼的唯讀快照。資料先由父代理選取，排除憑證、其他 stack 與無關檔案。要求它辨別環境／產品／偶發，列可重現證據、信心水準及下一個最小驗證，不讓它無上限重跑。

採專用白名單定義，而不是先給滿工具再逐支移除。讀取工具也須包路徑隔離，不能只封 shell。依事實回答，aos-sandbox 可逐工具套 bwrap：唯讀必要資料、僅可寫本次 artifacts、空 tmp、環境白名單；若只分析可 net=false。需要瀏覽器重現時應另由受控 runner 提供所需 loopback 連線，不預設放開外網。runner 能否與此沙箱一起使用必須先驗，不直接假定 systemd user bus、符號連結和 Chromium 都可運作。

拿掉一般 shell/run_python、self_tools/self_hook、一般檔案及 JSON 寫入、agent_def、agents_ctl、subagent、fork 等能力；mailbox 只給受限回報管道，避免任意目的地與 keep 寫檔。需要寫回歸案例時另開指定路徑授權，不恢復通用執行。eca-aos 提到 ws_write 有邊界坑，應核對實際配置，不當成完整隔離替代品。

## 3. 哪些約定變成約束，哪些沒有

現在經由 arena_e2e 的合法呼叫，會自動取得同一把鎖、套唯一 scope、查實際限制、強制新伺服器、限制結果目的地、清理後確認 unit 與埠；呼叫者不用自己記住這些步驟。scope 能對合作任務樹施加實際資源上限；strictPort 與禁止重用避免默默連到另一份程式；基準路徑及副本目的地由程式檢查。

但「所有 Node 都走此入口」、「只有 qa 能試玩」、「不改 src」、「不碰其他部門」依然主要是組織約定。qa 還有一般 shell、Python 與寫入工具；那些不會自動經 runner。工具自己也執行可信來源的 npm scripts/config/test，node_modules 連結不是唯讀，workspace 沒被 OS 凍結。scope 不限制路徑、外網或讀憑證；flock 仍是 advisory。

收尾方向不是宣稱工具已完全安全，而是分層：把固定執行移到受控 runner/執行服務；判斷代理只持有必要讀取與請求執行能力；OS 層隔離所有能執行或寫檔的入口。若還留一支無沙箱任意執行工具，就要誠實稱為合作代理的防失誤設計。誰能調整 policy、scope 與來源，也應由代理之外的管理權限控制，而不是同 uid 自行約定。

## 4. 資源分配

flock 加 scope 適合目前一件 Node 任務樹的規模：鎖負責合作排隊，scope 負責總量與回收，兩者不能互相取代。「一個 Node 程序」仍應避免作為政策措辭，因為 npm/Playwright/Vite 本來就是多程序。

動態埠比每人固定搶同一個埠好，但配置到 bind 仍有競爭窗口；目前失敗就回報，不重用別人的 server，這個取捨合理。瀏覽器 worker=1 及任務全域鎖讓試玩串行，不必現在就造複雜排程器。往後有多資源任務，再提供統一 lease、到期與取消回收；要能查誰持有哪把鎖、哪個 unit、哪個埠，不讓各部門再長自己的鎖順序。

還需補資源可觀測性：鎖等待時間、執行時間、memory peak、OOM 事件、有效 task 數與 CPU 限流。沒有這些，只能知道 4G 此次跑得完，不能合理調參。一般取消已測；SIGKILL/宿主崩潰仍需要代理外 watchdog 或 systemd 管理服務處理，不能靠 Python finally 保證。

## 5. 組織建議與給 eca-aos 的問題

組織可先做三件事：長任務在階段邊界讀信；受控 runner 的生命週期測試先列契約；固定流程不要開 agent，把模型留給缺陷判斷與回歸設計。回報分開「環境 BLOCKED」、「案例 FAILED」和「清理不能確認」，不要用 0 failed 掩蓋零案例啟動失敗。

想請 eca-aos 回答或考慮：

1. 有沒有建議的可重用取消／scope 生命週期 helper，涵蓋啟動窗口、SIGTERM、stop 失敗與狀態不明？目前兩個部門各寫一次，容易重複踩坑。
2. 能否提供可查的任務樹資源摘要，區分 rlimit、cgroup 生效值與 OOM/task/thread 失敗，並附實際 peak，而非只有啟動參數？
3. 對只有判斷能力的子代理，如何用專用定義加逐工具 sandbox 保證所有讀寫入口都封到，並測試絕對路徑、符號連結及間接工具恢復？哪些安全邊界需要不同 uid 或代理外服務？
4. aos-sandbox 與 systemd user scope、Chromium/loopback 的受支援組合為何？希望有小型實證配置，不要讓各部門自行猜 user bus 與掛載範圍。
5. 若 Python 工具被 SIGKILL 或管理程序退出，是否可由 agent 外層租約／服務保證 scope 停止後才讓下一任務取得資源？

上述是需求與問題，未自行修改 aos、OS 政策或排程設計。
