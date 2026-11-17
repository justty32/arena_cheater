# 詐賭競技場

[main.ts](../main.ts) 預設載入 [app.ts](app.ts)；`?prototype=classic` 另載入經典原型。規則與操作見 [戰鬥原型](../../docs/combat-prototype.md)。

<!-- wf-nav -->
| 入口 | 職責 |
|------|------|
| [model.ts](model.ts) | 鬥士、卡牌、裝備與對局型別、卡牌設定及範圍法術目標判定 |
| [engine.ts](engine.ts) | seed 入場、固定步進、生命週期、資源與結算 |
| [engine-combat.ts](engine-combat.ts) | 自動移動、面向、出招、體力、招架時機與角色分離 |
| [engine-damage.ts](engine-damage.ts) | 傷害、防禦耗能、虛弱上限與擊飛／跌倒／起身 |
| [engine-arrows.ts](engine-arrows.ts) | 三箭發射、直線掃掠命中、飛行到期 |
| [engine-cards.ts](engine-cards.ts) | 牌堆與石頭抽取、實例付款、出牌消耗及換石冷卻 |
| [engine-items.ts](engine-items.ts) | 卡牌目標與效果、範圍法術、投送物碰撞排序及裝備拾取 |
| [equipment.ts](equipment.ts) | 單雙手與盾互斥、裝備初始化彈藥／耐久 |
| [geometry.ts](geometry.ts) | 同時間段的移動圓碰撞掃掠 |
| [projection.ts](projection.ts) | 45° 投影、逆投影與圓場範圍 |
| [animation.ts](animation.ts) | 依遊戲時鐘取樣擊飛高度與起身進度 |
| [puppet.ts](puppet.ts) | 階層骨骼、獸人部件與手部裝備繪製 |
| [thrown-art.ts](thrown-art.ts) | 石頭、陶罐及投擲命中碎片繪製 |
| [area-art.ts](area-art.ts) | 範圍法術卡面、投影預覽圈及依遊戲時鐘演出的雷紋 |
| [view.ts](view.ts) | Canvas 場地、八門、遮擋排序、箭矢／投送、特效及選取判定 |
| [layout.ts](layout.ts) | 靜態 DOM 佈局、控制項、卡牌標記、費用文案與 Canvas 卡面 |
| [hand-view.ts](hand-view.ts) | 手牌及石頭節點同步、費用可付與付款預覽 |
| [app.ts](app.ts) | 介面狀態、選牌／施放／換石／拖曳、控制與幀更新 |
| [arena.css](arena.css) | 新競技場頁面樣式入口 |
| [hand.css](hand.css) | 手牌、石盤、換石及桌面／手機佈局樣式 |

引擎不依賴 DOM；畫面依模擬快照與 `state.time` 演出，不另算傷害、拾取及恢復。骨骼及裝備都是 Canvas 程式繪圖，沒有外部素材依賴。測試見 [核心導航](../../tests/simulation/README.md) 及 [瀏覽器導航](../../tests/e2e/README.md)。
