# aos 現有的權限與資源能力（eca-aos 2026-11-23 的回答）

[org](../../org/README.md)｜第一輪回顧 [org-retro-1](org-retro-1/README.md)

main 在第一輪結束後問了 eca-aos 三個事實問題，下面是它的答覆。它只回答「aos 現在有什麼」，沒有提出方案；方案要等使用者跟 eca-aos 談。原信封存在 main 的信箱 `mailbox/archive/`，信件編號 `01795412174548591287.752207.2015641`。路徑都在 `/home/guanyu/repo/aos/proto8/` 底下。有標「沒實跑」的地方，表示 eca-aos 沒有實際驗證過。

## 1. 路徑存取限制

- **檔案工具本身不擋路徑**。絕對路徑照樣能用，`ws` 只是預設目錄；shell 和 run_python 的說明裡也寫明了它們不是沙箱。
- **`ws_write`** 只能寫 ws 裡面的檔，而且會拒絕寫自己的 stack 和 `.stack`。它不在任何出廠定義裡，要用得自己掛上去。有個坑：stack 如果放在 ws 裡、名字又不叫 `.stack`，它還是寫得到。
- **kernel 和 kernel_gate 不管路徑**，它們只管 proc 的起停。
- **guard hook** 可以照路徑擋檔案工具，但它還在審查中，本身也寫明不是安全邊界，擋不住 shell。
- **真的擋得住的是 `aos-sandbox`**，底層用 bwrap。設定的意思：
  - `ro` 是唯讀，`rw` 是可寫，沒列出來的路徑根本看不到；
  - `/tmp` 換成一個一次性的空資料夾；
  - `net:false` 會斷網；
  - 環境變數只放白名單裡的。

  它是一支工具、一支工具分開包的，沒辦法一次替整隻 agent 套上沙箱。範例在 `py/aos/apps/sandbox/examples/shell-boxed/`，說明頁是 `aos/cli/sandbox.md`。這台機器沒有 s6-softlimit，所以沙箱設定裡不能寫 mem_mb、cpu_s、file_mb。
- **`limits.user` 的 sub:N** 只是換一個 uid 來跑，不是可寫清單。專案在 /mnt/c（drvfs），權限位元全開，換了 uid 多半還是寫得進去（沒實跑）。

## 2. 拿掉工具以後，下屬拿不拿得回來

- **拿得回來。** 只拿掉 shell、run_python、self_tools、tools_def 不夠。下屬還有這些路可走：
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

  只留 look、json 讀取、mailbox、gadgets，再加一支包在 aos-sandbox 裡的 shell。要寫檔就用 `ws_write`。更穩的做法是另外做一份專用定義，只放這幾包，不要一支一支設成 null。
- **極限**：在同一個 Linux 帳號下，只要還留著一支沒包沙箱、又能寫任意路徑或跑程式的工具，下屬就能把能力全部拿回來。

## 3. 跨 agent 的資源配額

- **rlimit 的五個鍵**（mem_mb、cpu_s、procs、file_mb、files）是每個行程各算各的，不會從一份總額裡扣。
- **mem_total_mb 和 procs_total 走 cgroup**。寫在 sub-daemon 那一列，它底下所有 agent 就共用一份。前提有兩個：上層 `daemon.json` 要寫 `"cgroup": "on"`，上層 daemon 要用 `systemd-run --user --scope -p Delegate=yes` 啟動（沒實跑）。
  - 沒有 CPU 總量的鍵。
  - 它只防失控，不防故意：同 uid 的行程改得了自己的 cgroup。
- **kernel 站**有 max_running 和排隊，但只管「起 proc」。agent 在自己 shell 裡跑的東西，它看不到。
- **`aos-lock`** 有等鎖和租約，跟 flock 一樣是大家約好遵守，不是硬擋。
- **不靠 aos、最接近需求的做法**：`flock <鎖> systemd-run --user --scope --collect --unit=node-e2e -p MemoryMax=4G -p TasksMax=256 -- <指令>`。行程死了，鎖會自動放；用 `systemctl --user stop` 能把整組子行程一起收掉（沒實跑）。

## 還沒定案、在等使用者的設計

這幾項都還沒有可用的東西：kernel 攔截 daemon 存取、sub:N 的後續、kernel 的資源基底和排程介面、初始 kernel 的權限件。
