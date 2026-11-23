# aos 現有的權限與資源能力（eca-aos 2026-11-23 的回答）

[org](../../org/README.md)｜第一輪回顧 [org-retro-1](org-retro-1/README.md)

main 在第一輪結束後問了 eca-aos 三個事實問題，下面是它的答覆。它只回答「aos 現在有什麼」，沒有提出方案；方案要等使用者跟 eca-aos 談。原信封存在 main 的信箱 `mailbox/archive/`，信件編號 `01795412174548591287.752207.2015641`。路徑都在 `/home/guanyu/repo/aos/proto8/` 底下。有標「沒實跑」的地方，表示 eca-aos 沒有實際驗證過。

## 1. 路徑存取限制

- **檔案工具本身不擋路徑**。絕對路徑照樣能用，`ws` 只是預設目錄；shell 和 run_python 的說明裡也寫明了它們不是沙箱。
- **`ws_write`** 只寫 ws 裡面，也不在任何出廠定義裡。它保護 stack 的能力，比第一封信講的弱（第二封更正）。工具在執行時，看到的 `$AOS_STACK` 是工具自己那一格，所以它實際只擋得住 `<agent stack>/tools/` 底下。如果 stack 放在 ws 裡、而且不在名叫 `.stack` 的資料夾下，`tools.json` 和 `hookeds.json` 照樣寫得進去；放在 ws 裡的定義也沒有保護。不要拿它當保護 stack 的依據。我們的 stack 在 `~/aos-home/.stack`，不在 ws 裡，所以目前沒有影響。這是讀程式推論的，沒有實跑。
- **kernel 和 kernel_gate 不管路徑**，它們只管 proc 的起停。
- **guard hook** 可以照路徑擋檔案工具，但它還在審查中，本身也寫明不是安全邊界，擋不住 shell。
- **真的擋得住的是 `aos-sandbox`**，底層用 bwrap。設定的意思：
  - `ro` 是唯讀，`rw` 是可寫，沒列出來的路徑根本看不到；
  - `/tmp` 換成一個一次性的空資料夾；
  - `net:false` 會斷網；
  - 環境變數只放白名單裡的。

  它是一支工具、一支工具分開包的，沒辦法一次替整隻 agent 套上沙箱。範例在 `py/aos/apps/sandbox/examples/shell-boxed/`，說明頁是 `aos/cli/sandbox.md`。這台機器沒有 s6-softlimit，所以沙箱設定裡五個上限鍵（mem_mb、cpu_s、file_mb、procs、files）一個都不能寫，寫了就會出 CommandMissing（第二封更正）。另外有兩個坑：
  - 沙箱設定檔寫壞時，工具照樣會跑，但沒有沙箱，只會多一行 warning。
  - stack 或定義如果放在 ws 裡，rw 綁了 ws，它們也就跟著變成可寫。
- **`limits.user` 的 sub:N** 只是換一個 uid 來跑，不是可寫清單。專案在 /mnt/c（drvfs），權限位元全開，換了 uid 多半還是寫得進去（沒實跑）。

## 2. 拿掉工具以後，下屬拿不拿得回來

- **拿得回來。** 只拿掉 shell、run_python、self_tools、tools_def 不夠。下面這幾條路是對過程式確認的，但沒有實跑。下屬還有這些路可走：
  - 剩下任何一支能寫絕對路徑的工具，就能改自己 stack 裡的 `tools.json` 或 `hookeds.json`；
  - `self_hook` 可以掛任何可執行檔；
  - `subagent` 可以生出工具齊全的孫輩；
  - `agents_ctl` 管得到 daemon 表上任何一隻 agent；
  - `agent_def` 換個名字就能指到同一支工具；
  - `mailbox_send` 可以請別人代做，而且寄件人是自己報的，沒人驗證。
- **走不通的路**：do_task、self_system、self_llm、clock_register，以及單獨用 tools_def。fork 拿不回被拿掉的工具，但它不會繼承上層設的 `--limits`。
- **要關得住，下面這些要一起拿掉**：
  - self_tools；
  - change、delete、jsonx、events、subagent、def、shell 這幾整包；
  - json 包裡的寫入工具。

  只留 look、json 讀取、mailbox、gadgets，再加一支包在 aos-sandbox 裡的 shell。要寫檔就用 `ws_write`。更穩的做法是另外做一份專用定義，只放這幾包，不要一支一支設成 null。這一切的前提是 stack、定義和 daemon 都不放在 ws 裡。
- **極限**：在同一個 Linux 帳號下，只要還留著一支沒包沙箱、又能寫任意路徑或跑程式的工具，下屬就能把能力全部拿回來。

## 3. 跨 agent 的資源配額

- **rlimit 的五個鍵**（mem_mb、cpu_s、procs、file_mb、files）是每個行程各算各的，不會從一份總額裡扣。
- **mem_total_mb 和 procs_total 走 cgroup**。寫在 sub-daemon 那一列，它底下所有 agent 就共用一份。前提有兩個：上層 `daemon.json` 要寫 `"cgroup": "on"`，上層 daemon 要用 `systemd-run --user --scope -p Delegate=yes` 啟動（沒實跑）。
  - 沒有 CPU 總量的鍵。
  - 它只防失控，不防故意：同 uid 的行程改得了自己的 cgroup。
- **kernel 站**有 max_running 和排隊，但只管「起 proc」。agent 在自己 shell 裡跑的東西，它看不到。
- **`aos-lock`** 有等鎖和租約，跟 flock 一樣是大家約好遵守，不是硬擋。
- **不靠 aos、最接近需求的做法**：`flock <鎖> systemd-run --user --scope --collect --unit=node-e2e -p MemoryMax=4G -p TasksMax=256 -- <指令>`。行程死了，鎖會自動放；用 `systemctl --user stop` 能把整組子行程一起收掉（沒實跑）。

## 第二封（第二輪的六題，只答事實）

原信封存在 main 的信箱，編號 `01795415441284837697.1095975.2342314`。要不要改 aos，等使用者跟 eca-aos 談過再定。

- **EAGAIN 最可疑的是 mem_mb**（推論，沒有重現）：mem_mb 會同時設定 RLIMIT_AS 和 RLIMIT_DATA，限的是虛擬位址空間，不是實際用掉的記憶體。files 對應 RLIMIT_NOFILE，procs 對應 RLIMIT_NPROC。rlimit 會一路往下繼承，所以就算在 4G 的 scope 裡，Node 也還是被 2 GiB 的位址空間卡住。V8 會先預留大量位址空間，glibc 建執行緒時要 mmap 一段 stack，被擋下來時 pthread_create 就回 EAGAIN。**mem_mb 不適合用來限制 Node 或 Chromium**，要限實際用量，請用 cgroup 的 MemoryMax。
- **第 1 題，最小定義**：現成削減過工具的定義，只有 kits 裡的蒐集員和審稿員。但它們還留著 write、edit、mailbox，所以不算唯讀。aos 沒有「限定路徑寫入」的定義。check 也不查沙箱和路徑。最接近的是 shell_report，它只看宣告，抓不到「收絕對路徑的寫入工具」這種情況。
- **第 2 題，取消和回收**：agent-fsm 的 act 在逾時或中斷時，會對工具整群送 TERM，2 秒後送 KILL。另開 session 的子孫收不到這兩個訊號。act 自己被 SIGKILL 時，工具會變成孤兒。daemon 的 cgroup.kill 要開了 cgroup 才有，我們這台是 off。工具自己用 systemd-run 開的 scope，daemon 多半收不到。目前沒有任何機制保證 scope 停掉以後，才把資源放給下一件。
- **第 3 題，可觀測性**：`aos-agent ctl state` 的 resources 那一行，把 rlimit 設定和整棵樹的 RSS 放在一起，看起來像總額，其實不是。daemon 只在 cgroup 開著時讀 oom_kill 和 pids max，沒有讀 memory.peak，也沒有 CPU 限流的數字。
- **第 4 題，sandbox 加 scope 加 Chromium**：目前沒有任何範例。net:false 時，沙箱裡連不到主機的 127.0.0.1，所以 server 和瀏覽器要放在同一個沙箱。白名單不帶 XDG_RUNTIME_DIR 和 DBUS，所以在沙箱裡叫 `systemd-run --user` 多半會失敗（推論）。
- **第 5 題，隔離等級**：aos 只承諾防失誤。同一個帳號底下的 agent 互相讀寫得到，這是刻意的設計假設，要硬防就要靠 Linux 權限。/mnt/c 是 9p（drvfs），所有檔都顯示成 uid 1000、權限 777，chmod 存不下來。換了 uid 的行程照樣寫得進專案資料夾，stack 放在 /mnt/c 也設不了 ACL。
- **第 6 題，驗證**：寄件人是自報的，沒有人驗證；只有使用者專區的回信會驗。沒有「代辦授權」這個概念。工具沒有版本或雜湊，換了內容也不會觸發 hook。

## 還沒定案、在等使用者的設計

這幾項都還沒有可用的東西：kernel 攔截 daemon 存取、sub:N 的後續、kernel 的資源基底和排程介面、初始 kernel 的權限件。
