# 詐賭競技場

[main.ts](../main.ts) 預設載入 [app.ts](app.ts)；`?prototype=classic` 另載入經典原型。規則與操作見 [戰鬥原型](../../docs/combat-prototype.md)。

<!-- wf-nav -->
| 入口 | 職責 |
|------|------|
| [model.ts](model.ts) | 鬥士、卡牌、裝備與對局型別、卡牌設定 |
| [engine.ts](engine.ts) | seed 入場、固定步進、生命週期、資源與結算 |
| [engine-combat.ts](engine-combat.ts) | 自動移動、面向、攻擊、體力、方向防禦與角色分離 |
| [engine-items.ts](engine-items.ts) | 卡牌驗證扣費、法術、投送飛行碰撞及裝備拾取 |
| [projection.ts](projection.ts) | 45° 投影、逆投影與圓場範圍 |
| [puppet.ts](puppet.ts) | 階層骨骼、獸人部件與手部裝備繪製 |
| [view.ts](view.ts) | Canvas 場地、八門、遮擋排序、投送、特效及選取判定 |
| [layout.ts](layout.ts) | DOM 佈局、控制項、卡牌與 Canvas 卡面 |
| [app.ts](app.ts) | 介面狀態、卡牌點選／拖曳、控制與幀更新 |
| [arena.css](arena.css) | 新競技場頁面樣式入口 |

引擎不依賴 DOM；畫面依模擬快照與 `state.time` 演出，不另算傷害、拾取及恢復。骨骼及裝備都是 Canvas 程式繪圖，沒有外部素材依賴。測試見 [核心導航](../../tests/simulation/README.md) 及 [瀏覽器導航](../../tests/e2e/README.md)。
