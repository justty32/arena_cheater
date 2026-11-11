# 戰鬥模擬測試

不依賴瀏覽器的核心行為回歸；執行方式與驗收範圍見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 驗證範圍 |
|------|----------|
| [arena.test.ts](arena.test.ts) | 七人圓場、seed／倍速、暫停、卡牌扣費、體力恢復、投送拾取、碰撞、方向與法術到期 |
| [arena-p3.test.ts](arena-p3.test.ts) | 弓三箭與飛行、末箭結算、木棍耐久／擊飛、防禦與虛弱 |
| [equipment.test.ts](equipment.test.ts) | 雙手盾衝突、最近者拾取、投送掃掠、暫停效果與末箭期間拒絕出牌 |
| [projection.test.ts](projection.test.ts) | 不同畫布尺寸的投影／逆投影往返及世界座標場界 |
| [battle.test.ts](battle.test.ts) | 完整對局、格位與資源、seed、倍速、暫停與動作耗能 |
| [potion.test.ts](potion.test.ts) | 藥劑有效／無效目標、資源邊界及勝負影響 |
| [projectiles.test.ts](projectiles.test.ts) | 飛行延遲、暫停、死目標與最後投射物結算 |
| [helpers.ts](helpers.ts) | 共用時間步進與雙角色情境 |

`battle`、`potion`、`projectiles` 與 `helpers` 為經典棋盤模式；新競技場有獨立模擬，不共用舊藥劑及格位規則。
