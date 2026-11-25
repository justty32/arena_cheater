# B900 與 A300 比例裁決補驗

仍為提案驗證，不是正式規則批准。基準7d9b7bbc621e3bb2728fe02154cb78adcdd77992，沿用凍結73列候選，各seed1..100，dt=1/30，全員拳／無盾／無裝備／無介入。每組實際值、來源patch、runner、verify JSON與100逐局末態均在本目錄，沒有改正式src/tests。

B900：僅B的world.matchDuration改900，100局全部自然決勝，0裁定／0平局；平均307.191秒、中位297.533秒、P90 341.033秒。勝者熊98／象1／牛1，其餘0。既有A900平均255.807秒、中位247.967秒、P90 283.833秒，同為100局自然決勝、熊98／象1／牛1。故本seed組B確實較長，但不是根據180秒全截尾猜測。

A300：僅A上限改300，98局自然決勝、2局比例裁定、0真平局；總戰長截尾平均255.103秒、中位247.967秒、P90 283.833秒。勝者熊98／象1／牛1。比例裁定在runner終場讀取存活者，hp與maxHp各乘100取整後交叉相乘，嚴格唯一最高者勝、同分平局；未新增第二層傷害比較。這是分析層裁定，未修改engine正式判勝。逐局resolution/naturalWinner可分辨自然與裁定；舊共用欄decidedGames/decidedMeanSeconds在A300含裁定勝者，不可當作自然結束統計。

所有Node走arena_verify，兩組test/build exit0、scope_cleaned=true，原結果JSON保存為*-verify.json。比例裁定沒有縮短100局中的98局自然結束時間，也沒有修正熊的極端勝率。

自動介入組本輪未跑；已回API可行性與延遲傷害歸因限制。沒有改牌庫或注入資源，不能據本輪推論法術能否縮時。

## 直接法術介入補跑（main 授權後）

A300、固定支持狼、seed1..100，首次t>=5之後每5遊戲秒一次窗口；狼死即停止。手牌順序嘗試第一張可支付且合法的 lightning/lightning-rain/divine-wrath，正常findPayment/validateCardPlay/playCard付款補牌；不重抽、不改牌庫、不注入石頭。目標優先活熊，否則敵人最高精確hp比例，同分保持fighters順序；AoE以目標中心。只有直接法術，沒有投擲和延遲傷害，也無陷阱、裝備、治療或加成。

共3664個窗口，成功8次（8局各1次）、未成功3656次；實際敵方hp減少合計18、支持者友傷0，均在出牌當幀量測並排除overkill，沒有歸因後續近戰。逐窗口成功／失敗、候選拒絕原因與牌／目標保留在 spells300-results.json；沒有符合的直接法術時rejections可為空。

98局自然勝／2局比例裁定／0真平局，熊98／象1／牛1。截尾平均255.078秒、中位247.967秒、P90 283.833秒；無介入A300平均255.103秒，差約0.025秒。有限政策受付款與手牌阻塞影響，不能代表真人作弊上限，也不能外推全部法術或投擲無效。

來源與A300相同，實際值逐byte一致，無額外src patch；runner spells300.test.ts、實際values、原始results及verify JSON已保存。test/build均exit0、scope_cleaned=true，log /tmp/aos/arena_cheater/dev/v3-logs/spells300/verify-rv4rl_d9/。本節取代前節「介入未跑」的當時狀態。
