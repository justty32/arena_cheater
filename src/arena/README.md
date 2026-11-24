# 詐賭競技場

[main.ts](../main.ts) 預設載入 [app.ts](app.ts)；`?prototype=classic` 另載入經典原型。規則與操作見 [戰鬥原型](../../docs/combat-prototype.md)。

<!-- wf-nav -->
| 入口 | 職責 |
|------|------|
| [model.ts](model.ts) | 相容入口，明確轉出 shared 型別、規則、卡牌表與判定；內部直接引用各來源 |
| [shared/types.ts](shared/types.ts) | 鬥士、卡牌、裝備、地面陷阱與定身截止狀態及對局型別 |
| [shared/rules.ts](shared/rules.ts) | 場地與陷阱半徑、投送起點／範圍／傷害設定、持續傷害時間容差 |
| [shared/card-catalog.ts](shared/card-catalog.ts) | 原序卡牌表、費用與效果設定 |
| [shared/targeting.ts](shared/targeting.ts) | 投送、陷阱、範圍法術合法目標與範圍內鬥士判定 |
| [shared/status.ts](shared/status.ts) | 待結算持續傷害與停止介入判定 |
| [engine.ts](engine.ts) | 相容入口，明確轉出原公共 API；內部直接引用來源 |
| [sim/engine.ts](sim/engine.ts) | seed 入場、固定步進、生命週期、資源與結算 |
| [sim/engine-combat.ts](sim/engine-combat.ts) | 自主移動與定身限制、面向、出招、體力、招架時機與角色分離 |
| [sim/engine-damage.ts](sim/engine-damage.ts) | 傷害、防禦耗能、虛弱上限與擊飛／跌倒／起身 |
| [sim/engine-arrows.ts](sim/engine-arrows.ts) | 三箭發射、直線掃掠命中、飛行到期 |
| [shared/resources.ts](shared/resources.ts) | 共用狀態亂數、石頭色序及補石；卡牌抽取與擊殺獎勵共用同一亂數流 |
| [items/engine-cards.ts](items/engine-cards.ts) | 牌堆抽取、實例付款與缺額狀態、出牌消耗及換石冷卻 |
| [items/engine-items.ts](items/engine-items.ts) | 共用出牌驗證與拒絕原因、卡牌目標與效果、範圍法術、投送物碰撞排序、裝備拾取及最新投送結構化結果 |
| [items/engine-traps.ts](items/engine-traps.ts) | 刺洞／捕獸夾共用放置、武裝與到期、首位掃掠接觸判定、傷害及生還者定身 |
| [items/equipment.ts](items/equipment.ts) | 單雙手與盾互斥、裝備初始化彈藥／耐久 |
| [sim/geometry.ts](sim/geometry.ts) | 同時間段的移動圓碰撞掃掠 |
| [projection.ts](projection.ts) | 相容入口，明確轉出原投影 API |
| [scene/projection.ts](scene/projection.ts) | 45° 投影、逆投影與圓場範圍 |
| [scene/animation.ts](scene/animation.ts) | 依遊戲時鐘取樣擊飛高度與起身進度 |
| [scene/puppet.ts](scene/puppet.ts) | 階層骨骼、獸人部件與手部裝備繪製 |
| [scene/thrown-art.ts](scene/thrown-art.ts) | 石頭、陶罐及投擲命中碎片繪製 |
| [scene/area-art.ts](scene/area-art.ts) | 範圍法術卡面、刺洞／捕獸夾圖形、投影預覽圈及依遊戲時鐘演出的雷紋 |
| [scene/label-layout.ts](scene/label-layout.ts) | 畫面座標中的姓名與資源條避讓配置，不改角色碰撞或選取位置 |
| [scene/view.ts](scene/view.ts) | Canvas 場地、八門、遮擋排序、角色標籤、箭矢／投送、特效及選取判定 |
| [ui/layout.ts](ui/layout.ts) | 靜態 DOM 佈局、控制項、卡牌標記、費用文案與 Canvas 卡面 |
| [ui/hand-view.ts](ui/hand-view.ts) | 手牌及石頭節點同步、費用可付與付款預覽 |
| [ui/support-hud.ts](ui/support-hud.ts) | 固定顯示支持者姓名、生命、陣亡狀態與本場擊殺獎勵累計，並提示陣亡 |
| [ui/mobile-panels.ts](ui/mobile-panels.ts) | 窄屏原生 details 展開狀態、跨尺寸保留與 aria-expanded 同步 |
| [ui/throw-feedback.ts](ui/throw-feedback.ts) | 最新投送的飛行、實際命中傷害、互撞及拾取摘要；不解析戰報 |
| [ui/payment-ui.ts](ui/payment-ui.ts) | 核心付款缺額與拒絕原因的介面文字 |
| [app.ts](app.ts) | mountArena 相容入口，明確轉出 ui/app.ts |
| [ui/app.ts](ui/app.ts) | DOM 與介面模組組裝，依原順序綁定事件與載入樣式 |
| [ui/arena-session.ts](ui/arena-session.ts) | 每次掛載的對局與介面共享狀態、模組接線型別 |
| [ui/arena-hud.ts](ui/arena-hud.ts) | HUD、名單、付款／瞄準提示、戰報及結果呈現，呼叫 Canvas 與既有子視圖 |
| [ui/fighter-details.ts](ui/fighter-details.ts) | 鬥士詳情、姿態／武器名稱、種族特性與狀態（含定身倒數）呈現 |
| [ui/card-actions.ts](ui/card-actions.ts) | 選牌、精確付款、自動選石、施放、換石、謹慎思考選牌與替補牌焦點 |
| [ui/arena-input.ts](ui/arena-input.ts) | Canvas 點擊／觸控瞄準、卡牌拖曳／取消與快捷鍵 |
| [ui/arena-controls.ts](ui/arena-controls.ts) | 開始／暫停、reset／retry 與手勢防護、倍速、名單與支持者操作 |
| [ui/arena-loop.ts](ui/arena-loop.ts) | 幀更新與時間上限、背景頁暫停、Canvas resize／DPR 更新 |
| [ui/arena.css](ui/arena.css) | 新競技場頁面樣式入口 |
| [ui/mobile.css](ui/mobile.css) | 窄屏布局、三卡與五色摘要及可展開區塊樣式 |
| [ui/hand.css](ui/hand.css) | 手牌、石盤、換石及桌面／手機佈局樣式 |

引擎不依賴 DOM；畫面依模擬快照與 `state.time` 演出，不另算傷害、拾取及恢復。骨骼及裝備都是 Canvas 程式繪圖，沒有外部素材依賴。測試見 [核心導航](../../tests/simulation/README.md) 及 [瀏覽器導航](../../tests/e2e/README.md)。

圓場 UI 位於 `src/arena/ui/`，不與經典模式 `src/ui/` 共用規則。樣式由 `ui/app.ts` 依 `arena.css` → `hand.css` → `mobile.css` 順序載入。
