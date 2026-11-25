# V3 第一切片正式產品審查

## 結論

通過。未發現本批需要 dev 修改的正確性、規格範圍或硬基準退化問題。這是非作者靜態審查，不代表 QA、真人試玩或遊戲平衡已通過。

依 main 請求 `01795570142028769023.827383.560672`，審工作樹產品／測試 diff、新增 format 與三份 V3 測試，對照 [規格](../design/assets/specs/v3-first-slice.md)、74 列 candidate_a 及 [作者交接](../dev/assets/v3-implementation-2026-11-25/README.md)。未改產品、未執行 Node、未開下屬、未提交。

## 傷害與控制

`src/arena/sim/engine-damage.ts:66` 的順序為拳＋武器＋象木棍＋fury，再乘虛弱、加嗜血；`src/arena/sim/engine-damage.ts:84` 先全免招架，其餘才做方向與格擋，最後量化至百分位，正傷最少 0.01、零傷不扣血。`src/arena/sim/engine-arrows.ts:11` 發射時呼叫同一加值公式，箭儲存獨立數字，不隨射手後續換武器／buff 改變。

`src/arena/sim/engine-damage.ts:122` 統一正規化扣血結果，死亡只走既有單次轉換；直接法術、陷阱與糞便持傷仍走 applyHealthDamage，不套持用加值、方向／盾或最小正傷保底。資料比對亦確認上述傷害與投送 raw damage 未改。物理投送仍經方向／盾處理，因此舊測試的背擊 1→1.2、club 格擋 2→1.5 是移除整數取整後的批准精度變更，不是偷調投送資料。

`src/arena/sim/engine-damage.ts:145` 的三段 deadline 接續前段期限，沒有以當前 tick 重算；三個獨立分支可在一次呼叫跨過多段。保留死亡優先與空中插值。新測試包含不同 dt、大幅跨期、微小正傷／零傷及浮點殘血；既有 root／死亡／受擊相關測試仍保留。

## 行動截止與清算

`src/arena/sim/engine.ts:44` 先推進投送、箭及持傷，300 秒後不再 act，不起新攻擊或觸發新陷阱；攻擊 pose 收回、控制仍可推進。出牌／換石的 resolving gate 保留。既有已落地裝備拾取與碰撞分離仍可發生，不會創建新箭、投送或持傷來源。

`src/arena/sim/engine.ts:65` 等待箭清空、投送全落地、無待結算糞便 tick 才判勝。合法 runtime 產生的箭有有限 expiresAt，投送有有限 landsAt，糞便有固定間隔及有限 until；截止後沒有新出牌／攻擊可無限刷新期限。死亡清掉持傷；存活者第五 tick 後也會清除。暫停仍須使用者繼續才會推進，屬既有暫停語意，不是清算死鎖。

`src/arena/sim/engine.ts:70` 以百分位 HP／maxHp 整數交叉相乘，比較唯一最高比例；相等不再比絕對血量或陣列順序。現行 100／150 上限下乘積遠低於 Number 安全整數範圍。裁決不呼叫扣血／死亡函式，因此不殺敗者、不發補石、不加 fury。自然殲滅、全滅與多人同分分支均保留；HUD／log 使用 resultReason 明示時限裁決。

新 arena-result 測試涵蓋絕對 HP 與比例相反、不同上限同比例、0.01 差距、箭與投送／五次持傷清算後翻轉領先者，以及裁決無擊殺獎勵。舊測試仍驗無害投送跨時限落地、死亡後箭擊殺等行為。

## 資料與硬基準

以 tabledb 逐列讀取提案及雙表，另從規格指定基準 `46935cfd685baad74c278c8888d109fa8c6ce45d` 取出舊表至 review 暫存，再由 tabledb 讀取比對。74 列 candidate_a 的值、單位、移除 id 及 old_value／old_unit 全部吻合；未列 runtime 與 metadata 列逐欄不變。201 個 runtime／metadata／schema id 集合一致，新加值 id 使用 hp，club 耗體獨立列，舊倍率 id 已移除。修改／新增 metadata 有暫定決策、存在的來源路徑及非空定位／理由；抽查近戰體表與弓中心距說明一致。

獨立比對 arena-balance-values 的硬編碼 fixture、schema 及提案，全部相符；沒有在測試執行時從 runtime 重生期望。arena-resource-values 與 HEAD 的結構差異共 82 個 scalar，只落在鬥士 HP 與 fury 8→5 的期限；牌、石、付款、RNG、效果、log 及其結構逐項不變。arena-entry-values 未改。其他舊測試的修改限定批准尺度／截止時間、格式引用或精度結果，沒有放寬為自我驗證。

近戰 `src/arena/sim/engine-combat.ts:31`／`src/arena/sim/engine-combat.ts:75` 的起手／命中均加雙方半徑，弓仍中心距。新邊界測試驗相等及超出 0.001、不同半徑；武器耗體另用硬值驗 exact／不足 0.01。射程數字由獨立 balance fixture 鎖定，邊界測試使用 B 專驗語意，兩者責任沒有混淆。

## UI 與驗證界線

名單、詳情、支持者 HUD、既有傷害效果／陷阱 log／投送回饋統一經 formatHp；生命上限與 aria-valuenow 一致，血條仍依實值。象木棍文案改固定加值；不擅改時間／體力格式。CSS 只補不換行與寬度，實際桌面及窄屏排版仍交 QA。

親讀作者永久 result.json、test.log、build.log：26 檔 231 案通過，test／build exit 0，兩個 scope_cleaned=true；stop_exit_code=5 對應已不存在的完成單元。review 沒有重跑這些命令，不把作者紀錄當自己的動態驗證。

review 的 Python/tabledb 獨立檢查與 git diff --check 通過；本批新增／修改產品及測試原始檔均未超過 300 行。檢查腳本與原始輸出暫存於 `/tmp/aos/arena_cheater/review/v3/check.py`、`/tmp/aos/arena_cheater/review/v3/check.log`。開工告示 notice.md／wall.md 不存在，未自行建立。

待 QA 驗證 Node ESM／Playwright discovery、E2E、實瀏覽器小數 HP／象文案／裁決及窄屏，並保留真人試玩缺口。熊優勢與有限法術介入可達性是 main 已知且暫定接受的設計風險，本輪不替使用者改數值或經濟。
