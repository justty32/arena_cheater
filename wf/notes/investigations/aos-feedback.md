# 給 eca-aos 的意見（累積中，尚未寄出）

[權限事實](aos-permissions.md)｜[回顧一](org-retro-1/README.md)｜[回顧二](org-retro-2/README.md)

2026-11-23 使用者說：eca-aos 很忙，不要一直寄信。先把對 aos 的意見、改進建議和使用經驗累積在這裡，等使用者說 eca-aos 有空了再寄。**寄的時候信要簡短，大的內容附這個檔的連結。** 寄出後把已寄的條目移到最下面的「已寄」，並註明日期。

每條寫成：現象（附證據路徑）→ 影響 → 建議（如果有）。

## 權限與隔離

- **跨 daemon 讀取沒有擋**：eca-aos 的下屬讀了 main 的信箱封存，超出它的任務範圍。read 類工具可以讀到任何 daemon 的 stack 和 mailbox。
- **下屬的寫入範圍只能靠文字約束**：dev-items（[定義](../../aos/defs/dev-items/README.md)）拿掉了 shell，但 edit 和 write 還是寫得到任何路徑。如果 edit 和 write 可以在定義裡設定允許的路徑前綴，「只寫任務書列的檔」就能從文字規則變成硬性限制。依使用者的意見，這只需要做到防失誤。
- **`limits.mem_mb` 會讓 Node 壞掉**：它設的是 RLIMIT_AS，V8 建立執行緒時會拿到 EAGAIN。我們改用 systemd scope 的 MemoryMax。詳見 [aos-permissions](aos-permissions.md)。建議在文件標註，或另外提供一個限制實際用量的 key。

## 資源分配

- 專案的 Node 一次只跑一份，做法是在工具裡加 flock，並用 systemd scope 限制在 4G、400%、256 個工作。實作在 `wf/aos/tools/arena_verify/` 和 `arena_e2e/`。aos 沒有跨 agent 的資源鎖或配額原語，每個專案都得自己做。

## 工具與能力缺口

- **agent-fsm 沒有看圖的工具**：qa 能截圖但看不到圖，視覺驗收只能交給 main（Claude Code）看。捕獸夾那輪是 main 看圖抓到「刺洞已布置」的文字 bug，證據在 `/tmp/aos/arena_cheater/qa/bear-trap-shots/`。建議提供一個能讓模型看到圖片的 read 或 view。
- **sol 模型常先找 `apply_patch`**：找不到才改用 edit，每次浪費一兩輪。

## 使用經驗（可以分享的）

- **固定程序做成工具，判斷工作才交給 agent**：只跑 E2E 這種事，用工具（arena_e2e）就夠了，不必開 agent。
- **信件交錯**：部門寄出的 BLOCKED 和 main 的回覆常在路上錯開。我們的規矩是「在每個階段的交界讀一次信」，見 [letters](../../org/letters.md)。
- **規則沒寫到的情況會讓部門停下來**：integration 因此卡了四次。後來加了「低風險就照自己的判斷做，回信附理由」，之後就沒再卡住。
- **唯讀的下屬很好用**：qa-triage 只有 read、glob、grep，用來分析 E2E 的紅燈，第一次實際使用就排除了誤判。

## 已寄

- 2026-11-23 以前：兩封事實問題、兩輪回顧，以及六個方向題（方向題等使用者和 eca-aos 談）。內容見上面的連結。

## 六個方向題的答覆（2026-11-24，eca-aos）

使用者 11-23 晚定了隔離等級：**甲，aos 只承諾防失誤，不做抗惡意隔離**。照這一級：

| 題 | 結論 | 對我們的影響 |
|----|------|------|
| ⑤ 文件寫明只防失誤 | 已做（aos `cf17b55e2`，rules.md、kits.md） | 我們的定義與角色卡照舊寫「防失誤，不是隔離」 |
| ① 最小定義範本＋漏包檢查 | 會做 | 出來後拿 qa-triage、dev-items 對照 |
| ③ 資源 | 只做可觀測（有效限制、peak、OOM）；准入不做 | flock＋systemd-run 繼續用 |
| ② 工具死掉時收乾淨 scope | 會做，排在 ①③ 之後 | 等它出來再拿掉自己的清理補丁 |
| ④ 專案資源配置 | 不由 aos 做 | 跑通的 arena_verify/arena_e2e 配置可交回當範例 |
| ⑥ 寄件人驗證、代辦授權 | 不做；工具版本識別之後再說 | 無 |

①②③ 排在 aos 的 templates 三分切換之後才開工。上層約束下屬照我們回顧的結論走：專用最小定義、工具包 sandbox。
