# V3 第一切片 QA 驗證紀錄

## 結論

2026-11-25 接 main 信 `01795570150811673932.828957.561551`，純驗證凍結工作區、不改 src/tests。首輪 **FAILED：21 通過、4 失敗、0 跳過**，未建立新基準，舊基準不變。失敗是既有 E2E 的遊戲時間推進預算不足；目前不是已證實的正式引擎終局缺陷，也不能當成全綠驗收。

HEAD `22b5368774663f0c98717308dd6e6171345e4ec1`，workspace fingerprint `94a75a8f3c9c37f8ce5f995a862724b15bfc4b7b9dd66422be7239fe1595b94e`。執行前全部 git 列舉檔 hash 與跑後核對無變更；qa 未改測試或程式。

## 正式執行

`arena_e2e(source="workspace", baseline="/tmp/aos/arena_cheater/qa/baselines/e2e-193affd.json", comparison_mode="title_project")`，耗時 401.665 秒、exit 1。Node discovery 與 JSON import 正常，25 案皆被發現；report_errors 空。scope 已 inactive/not-found、port 已關閉、cleanup_errors 空。

持久結果：[result.json](result.json)。原始 artifacts 在 `/tmp/aos/arena_cheater/qa/e2e-cf60d9f55a5d4daf84ffb03072dee8c3/`。第一次呼叫因暫存 baseline 不存在而預檢 BLOCKED、未啟 Node；按角色卡從保存基準重複製後才正式跑。

## 案例差異判斷

title_project added/removed 皆空；沒有標題或數量變動，只有以下四案從 expected 變 unexpected：

- 真實結算防止舊手勢，重試保留開局與支持，新局仍向前：`arena-results.spec.ts:69` 只推進 61 秒測試時鐘，3 倍速約 183 秒；error-context 時鐘為 03:03，未到新 300 秒門檻。
- 捕獸夾 1440px 暫停布置與定身、解除及同場重試：`arena-traps.spec.ts:89` 620 次 100ms、3 倍速約 186 秒，加前段戰鬥後 error-context 為 03:10，仍未到新時限。
- 捕獸夾 320px 暫停布置與定身、解除及同場重試：同一預算問題，error-context 為 03:10。
- 捕獸夾 390px 暫停布置與定身、解除及同場重試：同一預算問題，error-context 為 03:10。

三寬捕獸夾 seed 均為 73022。四案與 V3 的較長戰局／300 秒規則相容，測試仍綁定原 180 秒收尾假設，需遷移遊戲時間預算，不是單純加 Playwright timeout。四份 trace 未找到 pageError 或 ERR_NETWORK_CHANGED，見 [trace-errors.json](trace-errors.json)；不是網路 flake，不自動重跑。已寄 dev 信 `01795570922825252346.937768.638752` 請協調修改及補定向測試。

## 已有覆蓋與觀察

21 個成功案例包含卡牌付款／換石、單體與範圍法術、投送拾取、手機操作、classic 棋盤及投射物演出。三寬捕獸夾案例雖整體失敗，但在收尾前的支付一次、暫停不推進、定身可見、暫停維持、續戰解除斷言均已通過；這不等於擊飛／倒地完整三秒驗證。

trace 內可見三寬實際生命文字如 `0.2 / 100`、`1.4 / 100`，證明有小數而非全面進位整數；沒有定向到兩位小數、0.01 或 99.99，不能據此完成完整格式與不換行驗收。

## 截圖證據與限制

本輪共 21 張 PNG（17 張常規畫面、4 張失敗圖），完整相對路徑、來源及 sha256 見 [shots-manifest.json](shots-manifest.json)。保存基準的原始 PNG 暫存目錄已不存在，故目前全部列 after_only，**不是新增 UI，也不是已確認 21 張視覺差異**。不能做舊圖逐張 byte 比較；沒有圖片檢視入口，qa 未目視。

三寬均產出 hand／placed／rooted／released 圖；三張捕獸夾 result 及原真實結算 result 圖因收尾失敗未產出。鬥士 hp／體力尺度、傷害小數與象加值文案、時限結果文字是規格允許的預期變動；實際版面、字串與截圖差異仍須定向證據，不能只因規格允許而直接通過。請 main 檢視本輪 PNG，或補可用的舊圖來源後再比較。

## 尚未完成／不能執行／不適用

尚未完成：1440／320／390 的兩位小數去尾零、100 / 100 與 99.99 / 100 不換行、象加值文案、自然勝／300 秒裁決／平局 UI、倒地三秒後行動、四案終局後重試保留原開局斷言。已請 dev 補合法定向 E2E；本次 main 禁止 qa 改 src/tests，未自行追加。

不能執行：沒有互動瀏覽器及圖片檢視入口，無法真人試玩／目視判讀；只使用 arena_e2e 及離線 trace/DOM 證據。dev 核心測試報告可補公式與邊界證據，但不冒充 qa 瀏覽器驗收。

不適用：本輪非純重構，不要求數值與畫面逐 byte 維持舊版；網路 flake 重跑規則未觸發。新基準只有在失敗與定向缺口處理、差異合理且 review 通過後另提，不能把四個失敗結果存成新通過基準。


## 最後回歸：37/37 通過（取代首輪失敗結論）

main 後續信 `01795571026725695508.952788.649140` 授權 qa 改 E2E；qa 未改 src 或 simulation。保留首輪失敗證據，不將其改寫成通過。最終 run `e2e-591e02c0a26f4447ac44320ff85fd07c`，2026-11-25 02:27:58 至 02:34:35 UTC，**37 passed、0 failed、0 skipped，Playwright exit 0**，工具總耗時 397.344 秒，未超過 420 秒。fingerprint `e720008d0f6694d0ede8be0c035bbbe542144e0b9ebba6504175a02ba76d2822`，HEAD 不變。與最初檔案清單相比，production/simulation 只有 main 已允許並行的 balance metadata 更新；其餘 src/simulation hash 相同。

持久結果：[final-result.json](final-result.json)、[final-playwright.json](final-playwright.json)。工具頂層狀態為 FAILED，failure_stage=comparison，**不是執行失敗**：title_project 相對舊基準恰好新增下述 12 案，removed/changed/duplicates 全空。原 25 案全數保持 expected，report_errors 空，scope_cleaned/port_closed=true、cleanup_errors 空。舊基準未覆寫；這份全綠結果可作 V3 新基準候選，是否採用由 main 決定。

### 測試調整與覆蓋

- `arena-results.spec.ts` 與三寬 `arena-traps.spec.ts` 保留自然開局與原終局後重試斷言，只將收尾推進預算改為最多 110 秒測試時鐘（3 倍速約 330 遊戲秒），每次 fastForward 100ms 適配正式 loop 的 frame delta cap，提早結算即可退出。新增終局文案斷言，不注入終局、不跳過自然局。
- `arena-v3-fixture.ts` 攔截瀏覽器 session 模組回應，在唯一 createArena 錨點之後注入開局 state；斷言錨點與攔截各命中一次，不改 production 檔案、不寫 winnerId/resultReason/finished。正式 browser loop 算出結果。工程 fixture 不代表自然戰鬥覆蓋。
- 3 案：1440/320/390 的 99.99 / 100 詳情及支持區單行、寬度不溢位，aria-valuenow/max 保留實值；名單 9.72 HP、象加值文案與全頁不橫溢。手機會展開詳情與名單。
- 5 案：100、9.7、10、0.01、0 生命顯示與去尾零；正生命支持區仍 alive。這 5 案是預設桌面尺寸，不能宣稱三寬各數值全部組合皆測。
- 3 案：last-survivor、hp-ratio、draw 的標題、終局理由及戰報；時限案顯示 05:00，last-survivor 不誤稱時限。這是工程近終局 state，未手寫結果。
- 1 案：airborne 起點經 500ms 顯示倒地、再 2300ms 顯示起身、再 400ms 顯示尋找對手。證明三秒階段結束並回到 AI 行動狀態；沒有另量測恢復後座標位移，也沒有驗證自然攻擊命中觸發整段。

### 中途阻塞與失敗保留

曾採用 runFor(1000) 逐 RAF 推進，run `e2e-c7ed1b1b05644dbbb4223be34fc80580` 在工具 420 秒上限中止，只跑到 12/37；結果/捕獸夾出現 case 90 秒逾時，新 12 案未輪到。這是測試推進成本問題，沒有有效完整 JSON，不能報成零失敗。已改回 fastForward(100) 後才取得上述完整全綠結果。中途多次共用 Node 鎖等候 300 秒 BLOCKED，皆未啟 Node；遵照 main 協調持鎖 repo 後持續排隊，未換鎖或繞過工具。

### 最後截圖與剩餘限制

最終共產出 26 張 PNG；依 main 信 `01795574936791766741.1480740.1028320`，repo 的 [final-shots/](final-shots/) 僅保留 main 目視過的 6 張 V3 圖（三寬 hp-trait 與三種 result），合計 1,534,466 bytes（約 1.46 MiB）。其餘 20 張已搬到 `/tmp/aos/arena_cheater/qa/v3-first-slice-2026-11-25-excluded-shots/`，未刪除，但暫存不保證永久存在。全部 26 張的完整 test-results 相對路徑、原始來源與 sha256 仍保留在 [final-shots-manifest.json](final-shots-manifest.json)；`in_repo`／`storage` 標示是否進 repo，`saved` 是目前實際保存位置。相對本次 V3 首輪：11 張逐 byte 相同、6 張不同、9 張僅最終輪存在（6 張新 fixture、3 張先前收尾失敗的捕獸夾結果）。這不是相對舊版基準的視覺差異結論；舊版 PNG 仍不可用。動態位置/即時畫面可變，不以 hash 不同判定回歸。QA 無圖片檢視入口，未目視任何圖，請 main 檢視三寬 hp/trait 及三種結果圖。

未跑：逐三寬的 100 / 100 單行專案斷言、全滅 draw UI 專案案、自然擊飛觸發後的完整三秒及恢復座標斷言；不宣稱完整產品規格皆涵蓋。不能跑：互動真人試玩、目視視覺驗收、已消失的舊版 PNG 比對。不適用：本輪數值調整不要求與舊版 byte 完全相同；沒有 ERR_NETWORK_CHANGED，不套用網路 flake 忽略規則。核心公式/全滅/邊界由 dev simulation 報告另行佐證，非本次 QA 執行結果。

`git diff --check` 通過；沒有跑其他 Node 指令、沒有提交或改分支。


## main 目視與基準採用

main 信 `01795574365288852886.1401740.979430` 確認：**main 已目視這 6 張 V3 圖，符合 spec**（三寬 hp-trait 與三種 result 圖）。信中具體核對 1440/320 的 99.99 / 100、9.72 HP、100 HP 不換行及象加值文案；hp-ratio 的狼 100/100 對熊 75/150、05:00 與時限理由；draw 的狼 100/100 對熊 150/150 比例同分與平局理由。這是 main 的目視結論，並非 qa 自行目視，也不擴張為全部截圖或完整規格視覺驗收。

main 採用本輪 final-result.json，原樣保存為 `wf/org/qa/assets/baselines/e2e-v3-22b5368.json`，V3 後以此為基準；193affd 歷史基準保留。檔名短雜湊是執行時 HEAD，不表示測試的是純 HEAD。逐寬 100/100 單行、全滅平局 UI、自然擊飛完整三秒列入 improvements.md 後續候選，不阻擋本批。
