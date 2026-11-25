# V3 第一切片正式實作交接

依 main 信 01795568100941273258.507851.356563 與 design 74 列 candidate_a 實作。本批為暫定玩法／數值，待真人遊戲策劃確認；不是已通過 review／qa 或已提交的宣告。

## 實作範圍

runtime 與 metadata 兩表依 proposal-frozen.json 遷移；schema 同步新增武器／象／fury hp 加值與木棍耗體，移除舊倍率 id。未列 baseline 數值保持原樣；add/update 的 metadata 保留暫定標記、規格來源與 rationale。斧耗體為 1.5、木棍為 2，鹿速度為 1.2，均以批准表為準。

傷害依加值、虛弱、嗜血、方向／防禦順序處理；正傷最少 0.01，傷害與扣 hp 取百分位。控制 deadline 串接空中／倒地／起身三段，總長三秒，避免 dt 累積延遲。

300 秒後停止新行動，等待箭、投送與糞便持傷全部清算；多人存活按 hp/maxHp 比例裁決，百分位整數交叉相乘，唯一最高勝、同分平局，不產生擊殺獎勵。resultReason、HUD 與 log 區分自然勝與時限裁決。

hp／傷害文字共用 shared/format.ts，最多兩位小數且去尾零；象木棍文案改加值。窄屏生命文字補不換行／不縮排規則，仍待 qa 實瀏覽器確認。

## 核心驗證

正式 arena_verify(step=all)，test 與 build 皆 exit 0：26 檔、231 案全過；test 43.966 秒、build 15.507 秒。永久原始結果見 result.json、test.log、build.log。工具已清理兩個 systemd scope；stop_exit_code=5 為執行完成後單元已不存在，不是驗證命令失敗。

新 arena-v3.test.ts 驗證公式、精度、箭快照、控制期限及步長；arena-result.test.ts 驗證比例、不取整百分比、箭／投送／持傷清算後翻轉勝者、平局與自然勝；arena-v3-boundaries.test.ts 驗證表面射程／弓中心距離、耗體門檻、零體力移動、倒地恢復。舊測試只遷移批准的尺度與期限，資源 checkpoint 不改牌石／RNG 基準。

74 列逐項 Python/tabledb 核對與未列 baseline 不變檢查通過，見 data-check.txt。code map 已同步。沙盤戰局證據另見 ../v3-sandbox-2026-11-25/，本報告不把舊沙盤當正式 runtime 重跑。

## 交給下游

請 main 安排 design 核值、review 審查，再由 qa 做 JSON import 的 Node discovery／E2E、桌面與窄屏 hp 小數、象文案、時限裁決及新版戰局試玩。截圖可能隨正式數值與文字變更，需先說明差異再更新基準。dev 未啟 server、未跑 E2E、未 commit／push，亦未開下屬。
