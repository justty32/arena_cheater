# 第 5 步現值表核對

[資產庫](../../README.md)

最新結論：DONE，F01–F03 修正已通過[限定範圍複核](recheck.md)。以下保留首次核對紀錄。

首次結論：FAILED，須補文案一致性測試與兩列範圍半徑的中心距語義。未發現 198 列 value、unit 或來源定位錯誤；不是要求改平衡值。逐項修正要求見 [findings.json](findings.json)（3 項），由 main 轉 dev 唯一寫手處理。

## 基準與方法

依 main 請求 `01795493578621468028.1978377.1357436`，只讀核對 `src/arena/data/arena-balance.json` 與抽取前 commit `5456f20559f8a71ae52717caa616a3b3810b79c5`。未修改 src、tests 或執行 Node；本報告不代替 review、核心驗證及 QA。

用 tabledb API 逐列讀取資料，核對 source_revision、source_path、source_locator 原行號與完整行文、schema 型別／unit 及 decision。結果為 198/198 通過，見 [rows.json](rows.json)；檔案內保留受查 JSON 的 SHA-256，value 是本次核對快照，不是第二份可維護數值來源。

另將本次 12 個 TS 檔案的全部 B 引用，用實際 JSON 值逆代；只移除新增 import，並將牌副本 Array.from 還原舊兩元素寫法、動畫 0.35 還原 .35。12 檔逐位元組都與基準一致，且 198 個 id 全有引用，見 [inverse.json](inverse.json)。因此來源行中多個 literal 的對應亦由完整檔案等價檢查交叉驗證，不只檢查「該行有這個數字」。

## 語義核對

人工核對全部 id／value／unit，並對照公式與呼叫處：hp、stamina、stamina/s、m、m/s、s、rad、rad/s、ratio、count 合理；方向餘弦為 scalar，布林列以 scalar 配 boolean schema 表示無量綱開關，未當數字計量。盾投送 damage=0 是已啟用現值，不是待定值填零。

距離中鬥士／場地半徑、近戰體表 gap、弓中心距、場邊投擲起點至目標距、招架 gap、拾物中心距與體表 gap、擊飛位移、投送互撞中心距及碰撞 padding 均吻合現行公式；只有兩個範圍法術的 rationale 尚未交代中心判定，列 F03。

先前列出的狼倍率與時長、象木棍倍率、虛弱傷害與體力倍率、haste、擊飛距離、招架各窗口／冷卻／反震、受擊與格擋停頓、轉向／攻擊角／撿物偏好、投送互撞寬限及投送／箭 padding 均已入表。dev handoff 已列剩餘 technical.*、presentation.*、text.numericCopies 標籤與所在檔案／符號，並清楚說明不是 runtime id；算法、STEP、RNG、epsilon、round、最小傷害與繪圖常數排除合理。

decision 全為「現值等價抽取，非平衡批准」，source_revision 全指舊 TS，沒有把 V3 不同數值誤標成 V3 原文明定。多數 rationale 較概括，但不構成平衡批准；武器時長列的「原可選耗體欄位不補預設值」是形狀保留說明，非時長設計理由，可日後改善描述。

## 文案測試邊界

卡面傷害、秒數、距離、中文箭數／耐久／抽牌數，以及箭用盡和定身戰報已有一致性檢查；硬期望與原文快照並非全由 JSON 推導。仍漏象的 20% 特性文字，且部分重複 HUD／付款／說明文字只有其他位置被測，不能宣稱全部已覆蓋。F01、F02 要求補測而不是本批改文案或數值。尚未執行變異測試；缺口係讀測試斷言與引用範圍確認。
