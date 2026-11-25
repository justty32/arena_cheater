# V3 E2E 後續五案非作者審查

## 結論與範圍

通過，無必修 finding。依 qa 信 `01795576696346797728.1748418.1204276`，審查 `tests/e2e/arena-v3.spec.ts` 與 `tests/e2e/arena-v3-fixture.ts` 工作區 diff、正式控制路徑及執行證據。兩檔目前分別 182、34 行，未超過 300 行。review 未跑 Node、未開下屬、未改產品或測試，沒有自行目視或真人試玩。

## Fixture 觀測與隔離

`tests/e2e/arena-v3-fixture.ts:17` 只在 observe=true 時，於瀏覽器 session 模組回應內加入 `__qaV3Snapshot` 函式。函式每次回傳 JSON 深拷貝，不暴露可修改的 live state 引用；測試端另經 page.evaluate 序列化取得資料。它是測試觀測介面，不是產品 hook，也不是 OS／惡意腳本的安全邊界。

route 及 window 函式均限於當案的獨立 page/context，未寫磁碟或伺服器全域設定。原有唯一錨點／注入次數斷言保留，預設不啟用觀測；只有新增木棍案傳 true。沒有跨案共用 page，不會漏到其他測試。

`tests/e2e/arena-v3.spec.ts:129` 的開局設定兩個存活者、清空物品、配置位置、移除目標盾牌，讓持一耐久木棍的攻擊者可立刻起手且不主動位移；沒有預填 airborne、knockback、終局欄位或 finished。正式 `act` 完成起手後呼叫 `hit`，木棍命中走 `damageFighter` 與 `launchFighter`。減血、airborne、knockback 存在及木棍耗盡變徒手四項斷言共同驗證此路徑，不是直接寫入控制結果。

## 新增 UI 斷言

`tests/e2e/arena-v3.spec.ts:92` 的三寬 100/100 案，逐一展開需要的手機詳情並驗詳情與支持文字可見、精確等於 `100 / 100`，以 Range 行數等於 1 及元件內容不溢位驗單行，再驗全頁無橫向溢位。這補足先前三寬僅驗 99.99/100 的專項缺口，不只是檢查 CSS 宣告。

`tests/e2e/arena-v3.spec.ts:112` 全滅案以開局所有人 0 HP 為工程 fixture，按開始後由正式引擎結算；驗結果層可見、完整平局標題／理由、戰報含平局、存活數 0 與時間 00:00。未手寫結果，不將此案稱為自然攻擊造成全滅的覆蓋。

## 三秒控制與恢復位移

`tests/e2e/arena-v3.spec.ts:154` 使用正式 knockback.start 當相對起點，按真實瀏覽器 RAF 每次推進 16ms，再讀正式 simulation time。afterLaunch 有 250 次上限，而且必須通過取樣時間下界與小於目標加 40ms 的上界；迴圈用盡不會自動視為成功。

依序驗 0.30 秒 airborne、0.40 秒 fallen、2.70／2.95 秒 rising；2.95 秒的座標與落地取樣相等至八位小數，lastMoved 也必須不變。3.05 秒取樣則必須 walk，lastMoved 至少在 launch 後 3 秒，且相對前一取樣實際位移大於 0.001；另驗 DOM 姿態文案同步。這不是僅用尋敵文案推斷位移，也不讓碰撞推離代替自主移動證據。

下界加 `1e-9` 只處理首輪 `0.29999999999999993 >= 0.3` 的二進位誤差，遠小於正式 1/30 秒步長；40ms 上界、姿態、lastMoved 及位移斷言均未放寬。既有 37 案原碼也沒有刪弱。

證據界線是固定步長下的離散取樣，不是連續每一瞬間的三秒證明，亦非人類實時操作精度保證。工程開局引發的是正式木棍命中，不代表隨機完整自然戰局覆蓋。QA 報告有明示這些限制，宣稱與斷言相符；精確 deadline 邊界仍由既有核心測試另行補證。

## 原始證據核對

親讀 [QA 報告](../qa/assets/v3-followups-2026-11-25/README.md)、[最終工具結果](../qa/assets/v3-followups-2026-11-25/final-result.json)、[最終 Playwright JSON](../qa/assets/v3-followups-2026-11-25/final-playwright.json) 及 [離線比對](../qa/assets/v3-followups-2026-11-25/final-comparison.json)。最終 42 案均 expected，逐案 passed／retry 0／errors 空；unexpected、flaky、skipped 與全域 errors 均為 0。工具 status DONE、exit 0、耗時 295.031 秒，scope_cleaned／port_closed 為 true，report_errors／cleanup_errors 空。

review 用 Python 從前輪與最終原始 Playwright JSON 獨立比對 title/project 多重集合：37→42，恰新增指定五案，舊 37 案狀態全相同，無移除或重複。成功新基準 `wf/org/qa/assets/baselines/e2e-v3-f3c62ac.json` 逐 byte 等於 final-result.json，不是將失敗結果改標成功。

另讀首輪原始失敗與 trace-errors：木棍案確實停在時間下界浮點誤差；classic 案有 effects.css 的 ERR_NETWORK_CHANGED 與動態 import 失敗證據。首輪與修正後 fingerprint 不同，QA 有分開保留，未冒充同指紋網路自動重跑；再跑授權來源記於 QA 報告。本輪沒有以忽略失敗、改舊斷言或刪案例取得全綠。

## 交接

可交 main／integration 整合這兩檔 E2E 改動。三項後續已補自動化覆蓋；真人試玩與目視不在此次結果範圍，未因本輪通過而宣稱完整產品皆已驗收。
