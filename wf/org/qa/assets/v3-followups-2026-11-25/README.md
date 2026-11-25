# V3 三項後續 E2E：首輪失敗取證

main 請求 `01795575339314523165.1545865.1068572`，後續選 B（`01795575708776600200.1606282.1105519`）：不帶 baseline 單輪跑，離線比較舊 37 案。未連續重跑。

## 執行結果

run `e2e-e326dce83ecb4d4db1587cae7e66148c`，HEAD `f3c62aca6efa9fd67267e6a41025c8a0db2f85c1`，fingerprint `f516b9fe79af25d36d132f9955e9d282433ce968028820b19f05562dbfdea13c`。2026-11-25 03:04:20 至 03:09:32 UTC，311.197 秒，**40 passed、2 failed、0 skipped，exit 1**。scope/port 清理正常，report_errors 空。完整 [result.json](result.json)、[playwright.json](playwright.json)。沒有產生成功新基準。

新增三寬 100 / 100 詳情及支持區單行、不溢位三案與全滅平局 UI 一案皆通過。木棍命中案已通過正式命中減血、airborne、knockback 存在及一耐久木棍耗盡變拳頭等斷言，但在第一個 0.30 秒時間斷言失敗：`0.29999999999999993 >= 0.3` 為 false。這是 QA 浮點數斷言誤差，不是已證實的引擎失控 bug；後續倒地、起身及恢復位移斷言尚未執行，不能報為通過。

舊案例「降低動態效果時仍顯示飛行物、命中與傷害資訊」等待 classic board 失敗；trace 明確記錄 `/src/ui/effects.css` 的 `_failureText=net::ERR_NETWORK_CHANGED`，並導致 classic 動態 import 失敗。見 [trace-errors.json](trace-errors.json)。這是主機網路事件證據，不歸因於案例或 CSS 回歸。木棍案 trace 無 pageError/ERR_NETWORK_CHANGED。兩種失敗分開處理；本輪不符合只有網路失敗的同指紋自動重跑，不自行忽略。

## 離線比對

見 [comparison.json](comparison.json)。Python 以 `(tuple(title_path), project)` 為鍵，比對鍵的多重集合，並對共同鍵比較 status；先檢查兩邊沒有重複鍵才使用 dict 逐案比較，避免覆蓋同名。結果：37 → 42，恰好新增預期 5 案、移除 0、兩邊重複 0；舊 37 案有 1 案 expected → unexpected（上述網路事件），故不能宣稱舊案例狀態完全不變。

## 處理與限制

依 main 要求先取證回報，不連續重跑。建議將時間下界與 `seconds` 的比較加極小浮點容差（1e-9），保留 40ms 上界、全部姿態及恢復位移斷言；此處容差僅對二進位表示誤差，不放寬三秒控制規格。需 main 同意修測試及再單輪驗證。QA 未改 production/simulation，未提交。

未跑：時間失敗之後的自然命中失控階段與恢復位移斷言；尚未送正式通過 review。不能跑：真人/圖片目視（本輪無新增截圖）；不適用：未全綠，不建立或採用成功基準。舊 `e2e-v3-22b5368.json` 是保留原始 comparison FAILED 的證據，工具不能以其作 baseline；之後可用的基準必須是不帶 baseline 執行且 status 成功的結果。


## 授權修正後：42/42 通過

main 信 `01795576287022852516.1690009.1163343` 同意僅在時間下界加 `1e-9` 容差，40ms 上界及全部姿態/位移斷言保持不變，並授權再排單輪。run `e2e-551472e9dd6144dcb1b10ec8125afdeb` 不帶 baseline，2026-11-25 03:12:01 至 03:16:56 UTC，295.031 秒，**status DONE、exit 0、42 passed、0 failed、0 skipped**；scope/port 清理正常，report_errors 空。HEAD `f3c62aca6efa9fd67267e6a41025c8a0db2f85c1`，workspace fingerprint `735860372712581b8c619bb6027e2b2aaba79df6591f8707f6d63d4253ce1768`。這次包含測試修正，fingerprint 與首輪不同，不冒充同指紋網路重跑。

完整 [final-result.json](final-result.json)、[final-playwright.json](final-playwright.json)。原樣另存成功新基準 `wf/org/qa/assets/baselines/e2e-v3-f3c62ac.json`；短雜湊是執行時 HEAD，含未提交 E2E 工作區修改，非純 commit 結果。舊失敗證據仍保留。

[final-comparison.json](final-comparison.json) 離線採 `Counter((tuple(title_path), project))` 比鍵與次數，再對共同鍵比較 status Counter，忽略檔名。37 → 42，恰好新增 5 案；removed/changed/duplicates 全空，舊 37 案全維持 expected。

新增三寬 100 / 100、全滅平局 UI 與正式木棍命中恢復位移五案全過。擊飛案的開局 fixture 只有位置/武器/時機配置，未預填控制姿態或終局；由正式 act/hit/damage 觸發減血與 knockback。瀏覽器回應內可選 getter 僅回傳 JSON 深拷貝，用以讀正式 simulation time/pose/座標，不讓測試改 live state。驗證 0.30s airborne、0.40s fallen、2.70/2.95s rising；落地至2.95s無自主位移，3.05s已walk且lastMoved至少在launch後3秒、位移大於0.001。這是離散取樣（上界40ms）而非連續每一瞬間或實際人類遊玩時鐘的精度保證。

三項候選現已完成自動化覆蓋，原「未跑」欄僅描述首輪。仍不能執行真人/圖片目視，未新增大圖進repo；沒有為取得成功刪弱舊斷言。待非作者 review 審兩個 E2E 檔案，再由 main 交 integration。
