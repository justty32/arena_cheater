# 戰鬥模擬測試

不依賴瀏覽器的核心行為與呈現幾何回歸；執行方式與驗收範圍見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 驗證範圍 |
|------|----------|
| [arena.test.ts](arena.test.ts) | 七人圓場、seed／倍速、暫停、卡牌扣費、體力恢復、投送拾取、方向 |
| [arena-cards.test.ts](arena-cards.test.ts) | 實例付款與缺額、共用出牌拒絕原因及送出重驗、出牌補牌補石、三秒換石冷卻、法術刷新與到期、介入時機、seed 重現 |
| [arena-card-draw.test.ts](arena-card-draw.test.ts) | 牌堆組成、三牌三石、直覺預告與實際抽牌順序、謹慎思考選牌、牌堆回收與守恆 |
| [arena-rewards.test.ts](arena-rewards.test.ts) | 支持者擊殺補石與累計獎勵、投送無歸屬、狼擊殺狂熱刷新／到期與死後箭矢、鹿高速 |
| [arena-bear-trap.test.ts](arena-bear-trap.test.ts) | 捕獸夾牌庫守恆、即時放置、精確付款補給、拒絕原子性與 RNG 不變 |
| [arena-traps.test.ts](arena-traps.test.ts) | 兩種陷阱共用武裝／到期／半徑邊界、掃掠與穩定排序、陣營／姿態、致死與無歸屬、定身刷新 |
| [arena-root.test.ts](arena-root.test.ts) | 定身阻止自主追擊／追裝備，但保留攻擊、防禦、轉向、恢復、拾取與被動位移；精確到期與死亡 |
| [arena-bear-trap-integration.test.ts](arena-bear-trap-integration.test.ts) | 暫停布置與倒數凍結、最近投送隔離、重開、末段拒絕／結算、seed 與倍速重現 |
| [arena-area.test.ts](arena-area.test.ts) | 範圍法術的距離邊界、多目標、付款、無效目標、暫停及全滅結算 |
| [arena-throws.test.ts](arena-throws.test.ts) | 投擲首次命中與混合碰撞排序、超距狀態不變、盾與陶罐、一次性物件、在途投送物結算、長矛單石投送、短斧投送命中與可拾取、目前站位的首個可能碰撞 |
| [arena-dung.test.ts](arena-dung.test.ts) | 屎的命中、持續傷害刷新、虛弱、暫停與末跳結算 |
| [arena-throw-feedback.test.ts](arena-throw-feedback.test.ts) | 最新投送結果綁定、同一投送命中／拾取更新、舊投送隔離、招架零傷／落空／碰撞摘要 |
| [arena-p3.test.ts](arena-p3.test.ts) | 弓三箭與飛行、末箭結算、木棍耐久／擊飛、防禦與虛弱、長矛起手距離、命中重驗與出手節奏、短斧普通格擋破盾與招架保盾 |
| [equipment.test.ts](equipment.test.ts) | 單手武器（含短斧）配盾、雙手盾衝突、最近者拾取、投送掃掠 |
| [label-layout.test.ts](label-layout.test.ts) | 群聚標籤／角色矩形避讓、resize界內、暫停穩定與新局清除偏移記憶；不判斷美術品質 |
| [projection.test.ts](projection.test.ts) | 不同畫布尺寸的投影／逆投影往返及世界座標場界 |
| [battle.test.ts](battle.test.ts) | 完整對局、格位與資源、seed、倍速、暫停與動作耗能 |
| [potion.test.ts](potion.test.ts) | 藥劑有效／無效目標、資源邊界 |
| [projectiles.test.ts](projectiles.test.ts) | 飛行延遲、暫停、死目標與最後投射物結算 |
| [helpers.ts](helpers.ts) | 共用時間步進與雙角色情境 |

`battle`、`potion`、`projectiles` 與 `helpers` 為經典棋盤模式；新競技場有獨立模擬，不共用舊藥劑及格位規則。
