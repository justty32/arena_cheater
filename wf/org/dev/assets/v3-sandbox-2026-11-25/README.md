# V3 第一切片：隔離沙盤首輪證據

本批是測量，不是正式平衡批准；正式 src/tests/數值表未修改。候選落地等 main 定案。

## 結果

現況 100 局全部決勝，平均 27.916 秒、中位數 27.3 秒。狼／熊／象／牛／豪豬／蛇／鹿勝率依序 8／31／29／19／13／0／0%。A 與 B 均 100 局於 180 秒超時平局，截尾平均與中位數均 180 秒，已決勝平均／中位數為 null。不能把無勝者的 0% 解讀成某物種較弱。

A 結束時平均存活 4.35 隻、剩餘 hp 總和 190.804；B 為 4.71 隻、251.38。每局各鬥士末態 hp/stamina 保留在 *-results.json。首輪沒有收集命中次數、造成傷害、缺體力時間、格擋或招架次數；補跑另交。

## 實驗契約

- 基準 archive commit：7d9b7bbc621e3bb2728fe02154cb78adcdd77992。proposal 標示基準 46935cfd；git diff 46935cfd 7d9b7bb -- src 為空，且全部既有 proposal old_value/old_unit 與實際 archive 一一相符。
- seeds 1..100；dt=1/30 秒；比賽上限 180 秒。浮點累加實際終止時鐘可能 180.033333 秒，截尾統計以 180 計。
- 開局全員裸拳、無盾、無地面裝備；不出牌、不重抽、不介入，預設支持狼只是標記。successfulInterventions=0。
- 73 列候選照凍結 proposal.json 套用，實際全值見 a-manifest.json、b-manifest.json。不應以早期討論中的拳傷、體力或恢復數字取代實際表。A idle/movingRecovery=2/1；B=1/0.5 stamina/s。牛 stamina=12。
- 加值式武器／象木棍／fury 後乘虛弱，再加嗜血；箭保留發射快照；背擊／盾等修正後傷害取 0.01，正傷下限 0.01；每次扣 hp 取 0.01。控制期限串接，airborne/fallen/rising=0.35/2.3/0.35 秒。
- A/B 所有 src .ts 逐 byte 相同，數值只有 idleRecovery/movingRecovery 不同。所有300局初始位置、朝向、nextAttack 與裝備逐 seed 一致；不同的 hp/stamina 沒當成 RNG 回歸。
- 只驗證報表與定向契約測試，不宣稱原正式整套測試全過。未測 UI／武器政策／盾／真人介入；候選 patch 中文案僅作建置相容，不是正式 UI 完工。

## 產物與重現

summary.json 為匯總，*-results.json 為 runner 原始實驗輸出（每組100局），*-manifest.json 為實際值與變更快照。*-candidate.patch 相對 archive 的 src 差異，baseline patch 為空。checks.json 保存初始一致性與原始證據 SHA256。spec.md/proposal.json 是當次凍結來源，後續規格補充不會回寫本證據。

prepare-v3.py 以專案根目錄執行，透過 wf/tools/tabledb API 套值；預設暫存根 /tmp/aos/arena_cheater/dev，要求 v3-baseline/a/b 不存在。重現時先選另一個專用暫存根並修改 script 的 root，再把已知 commit 用 git archive 匯出至該根的 v3-sandbox。不要刪除既有實驗資料。node_modules 可連到相同 lockfile 的已安裝依賴，不安裝新套件。

將 sandbox-report.test.ts 放各組 tests/simulation；A/B 另放 candidate-contract.test.ts。用 arena_verify(workspace=各組副本, step=all) 跑，讀取產生的 sandbox-results.json。正式工具鏈與入口檔不改。

原三組 test/build 均 exit 0，log：
- /tmp/aos/arena_cheater/dev/v3-logs/baseline-final/verify-lehf9603/
- /tmp/aos/arena_cheater/dev/v3-logs/a-final/verify-pi7cal26/
- /tmp/aos/arena_cheater/dev/v3-logs/b-final/verify-6709hrm2/

工具 F01/F02 修正前已跑首輪；人工確認三副本 src/tests 無 symlink，工作樹 src/tests 未變。修正後 A 加副本專屬 sentinel（候選 clubBonus=3）重跑，完整結果與首輪相同，test 3案/build均0、scope_cleaned=true。保存結果 JSON 與 logs：/tmp/aos/arena_cheater/dev/v3-logs/a-reviewed-final/verify-rb9fangc/。前次 sentinel 誤填2失敗的 log 仍保留在 a-reviewed/verify-y7g4c9of，修的是測試期望、沒有修改候選值。工具非作者複審另由 review 回覆。
