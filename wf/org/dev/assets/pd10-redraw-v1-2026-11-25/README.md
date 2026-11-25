# PD10 換石政策 v1 單組實跑

[政策契約](../../../design/assets/audits/pd10-2026-11-25/redraw-policy-v1.md)｜[固定基準](../pd10-2026-11-25/README.md)

## 結果與限制

僅跑 V3 `03b15e1f05ad5701f6c47f7fb7fcc62460c39cfd` 一組 seed 1..100，不重跑基準、不改正式 src/tests 或數值。本次簡單換石政策在固定樣本減少卡色並使原六個零正常出牌 seed 全部啟動，但不代表最佳策略、真人操作成本低或經濟平衡已可接受。換石同時改變手牌、石色與 RNG 消耗，不能把差異全歸因補石量或單一顏色；未測有效傷害與趣味。

全局「原全牌基準 → 換石 v1」：可介入窗口 3167 → 3135；正常出牌 1984 → 2959；換前卡色窗口 1183（37.35%）→176（5.61%）；至少正常出牌一次 94 →100 局；零正常出牌 6 →0；零有效動作 6 →0。末個可介入窗口仍卡色 52 →4 局（seed 42、90、98、99）。seed 90 末窗換石成功、但沒有下一可介入窗口，不宣稱已解套或永久死鎖。

同 seed 兩政策均可介入的 scheduled 交集為 2990 窗口：基準正常出牌 1960／卡色 1030（34.45%），換石 v1 正常出牌 2814／卡色 176（5.89%）。配對不能消除策略導致的全部戰鬥與 RNG 差異；全局與配對分開解讀。

原六零正常出牌 seed 9、20、28、29、46、61，本輪正常出牌依序 29、20、13、30、24、14 次，換石成功 2、2、2、2、1、1 次；六局首次正常出牌皆約 t=15 秒。逐 seed 首末庫存、配對窗口、零啟動與末窗卡色值在 comparison-summary.json 的 originalSixZeroPlaySeeds／perGame。

換石嘗試 86，成功 86，拒絕 0。換石均仍算換前卡色窗口，不改列正常出牌成功。86 次換石中，85 次後續觀察到正常出牌，等待時間中位 5 秒、平均 5.824 秒、最大 15 秒；另一次沒有觀察到，保留未發生，不從分母偷刪。此統計每次換石皆找其後首次正常出牌，若中間再換石可能共用後續出牌事件，不代表85個獨立對局或單次換石因果效果。

平均戰長 228.901 →225.125 秒，中位 221.967 →216.167 秒；平均狼可介入時長上限 160.910 →159.451 秒。首次正常出牌平均（僅發生局）6.064 →5.700 秒，中位皆5秒；完整分布見 overview.json。

## 政策與量測

沿用原全牌初始化、dt=1/30、每5秒窗口、目標搜尋、支付及思考選index0。每窗先找正常可出牌；有成功就重設卡色計數，不換石。只有換前 colored-stones 主因累加，其他主因歸零；跳過窗口不改計數。連續兩窗卡色後以原生 redrawStones 棄當前手牌第一張、選庫存第一顆石，不按色／費優化、不偷看牌序。換石成功重設計數，同窗不追加出牌；拒絕保留計數並驗證狀態完全不變。

共用 spendCard／consumeCard 僅新增可選量測來源參數，預設 card-payment；換石呼叫點傳 redraw-payment，換石 drawStones 呼叫點標 redraw-income，未改付款、抽取、冷卻或 RNG 次序。普通施法與換石付款事件分別對帳，不把換石棄牌當施法。

本輪收入起手300石、正常出牌補5918石、換石補172石、支持殺補180石；支出正常出牌5154石、換石86石，末態合計1330石。每事件前後逐色及終局逐色對帳通過，正常付款事件=2959、換石付款事件=86。逐色數字在 overview.json／comparison-summary.json；原始石ID、棄牌ID／色、拒絕理由、各次換石時間及庫存在外部 raw。policy-check.json 另以 Python 核對全部100局初始化與固定基準相同、門檻、首牌首石與正常出牌計數。

## 驗證與保存

全部 Node 經 arena_verify 共用鎖，前兩次等鎖180秒超時，steps空；第三次 verify-f079al6i 成功，test 34.581秒、build 9.922秒，exit皆0、scope_cleaned=true。stop_exit_code=5伴隨inactive/not-found表示scope已完成不存在。只跑隔離runner單案100seed，非正式全套核心測試；沒有E2E。所有verify JSON及log在 verification/。

本輪 raw 位於 `/tmp/aos/arena_cheater/dev/pd10-redraw-v1-2026-11-25/new/pd10-new-all-redraw-v1-results.json`；基準沿用 `/tmp/aos/arena_cheater/dev/pd10-2026-11-25-raw/pd10-new-all-results.json`。兩者不進repo、不是永久備份，暫存可能被清理；manifest.json保存externalPath、inRepo=false、大小與SHA256。摘要、逐局比較、runner、插樁、重建及分析腳本留repo。

重現時在專案根用Python執行prepare.py（預設暫存workspace已存在時會拒絕；先保留歷史證據，改用全新暫存root），從指定revision git archive套instrumentation.patch、放audit.ts及runner、連結既有node_modules。再呼叫arena_verify workspace指向副本、step=all、timeout_s=300、lock_timeout_s=180，不直接跑Node、不並行。analyze.py以固定兩份外部raw重建比較摘要（路徑須與實際保存位置一致）。manifest中的來源及腳本可核對，沒有改舊組原始資料或重跑舊組。
