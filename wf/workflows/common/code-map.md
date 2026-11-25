# code-map — 程式碼導航 index（哪個檔負責什麼）

[common/README](README.md)｜[INDEX](../../INDEX.md)

碰原始碼前先查這張表，只讀相關領域列出的檔；動完再照維護鏈把表更新回去。寫碼慣例本身在 [conventions](conventions.md)。

目前預設為 Canvas 2D 七人圓場原型，另保留 `?prototype=classic` 經典棋盤；玩法及實作假設見 [戰鬥原型](../../../docs/combat-prototype.md)。

## 領域表

<!-- wf-nav -->
| 領域 | 檔案 | 職責 | 測試在哪 |
|------|------|------|---------|
| 入口與新圓場 | [main.ts](../../../src/main.ts)、[arena 導航](../../../src/arena/README.md) | 模式載入；圓場介面入口與 session／HUD／卡牌操作／輸入／控制／幀更新分工；圓場戰鬥、範圍法術、共用刺洞／捕獸夾掃掠與定身、弓箭與投擲碰撞、傷害防禦、裝備槽、牌堆與精確選石付款、共用出牌驗證、支持者狀態、Canvas 演出與窄屏介面 | [核心測試](../../../tests/simulation/README.md)、[瀏覽器測試](../../../tests/e2e/README.md) |
| 狀態與規則 | [model.ts](../../../src/game/model.ts)、[rules.ts](../../../src/game/rules.ts) | 型別、編隊、數值、seed、事件 | [核心測試](../../../tests/simulation/README.md) |
| 戰鬥模擬 | [engine.ts](../../../src/game/engine.ts)、[combat.ts](../../../src/game/combat.ts)、[attacks.ts](../../../src/game/attacks.ts)、[pathfinding.ts](../../../src/game/pathfinding.ts) | 生命週期、步進、作弊、出招、投射物／傷害、尋路及視線 | [核心測試](../../../tests/simulation/README.md) |
| 經典介面與演出 | [classic.ts](../../../src/classic.ts)、[介面導航](../../../src/ui/README.md) | 舊棋盤輸入、幀更新、佈局、狀態、圖示及樣式 | [瀏覽器測試](../../../tests/e2e/README.md) |
| 環境與建置 | [package.json](../../../package.json)、[vite.config.ts](../../../vite.config.ts)、[playwright.config.ts](../../../playwright.config.ts) | scripts、型別／建置與測試設定 | [testing](../testing.md) |
| 網站部署 | [pages.yml](../../../.github/workflows/pages.yml) | main 驗證、靜態產物與 GitHub Pages 發布 | [GitHub Pages](../dev-env.md#github-pages) |
| 工作流工具 | [tools/](../../tools/) | 文件檢查與資料檔操作；非遊戲引擎 | 來源工具原樣導入 |

表中的 `src/game/` 狀態與戰鬥模組屬經典模式。新圓場根層 `app.ts` 保留 mountArena 相容入口；十四個 UI 模組與三份 CSS 位於 `src/arena/ui/`，`ui/app.ts` 僅組裝介面，樣式依 arena → hand → mobile 順序載入；arena.css 已移除無模板或動態 class 消費者的 player-resources／mana-resource／gold-resource／mana-meter 舊資源規則（含三個窄屏斷點），其餘規則與載入順序不動；共享狀態與接線型別在 `arena-session.ts`，呈現在 `arena-hud.ts`／`fighter-details.ts`，卡牌操作在 `card-actions.ts`，輸入在 `arena-input.ts`，對局控制在 `arena-controls.ts`，幀與頁面生命週期在 `arena-loop.ts`；各檔入口見 [arena 導航](../../../src/arena/README.md)。經典樣式載入順序見介面導航。圓場核心五檔位於 `src/arena/sim/`，卡牌道具四檔位於 `src/arena/items/`；根層 [engine.ts](../../../src/arena/engine.ts) 保留明確轉出的原公共 API，介面直接引用 sim／items 來源；場景七檔位於 `src/arena/scene/`，根層 [projection.ts](../../../src/arena/projection.ts) 保留原投影 API 相容入口，內部直接引用 scene 來源；詳細入口見 arena 導航。圓場 [model.ts](../../../src/arena/model.ts) 保留明確轉出的相容入口，內部直接引用 [shared/types.ts](../../../src/arena/shared/types.ts) 型別、[shared/card-catalog.ts](../../../src/arena/shared/card-catalog.ts) 卡牌表、[shared/targeting.ts](../../../src/arena/shared/targeting.ts) 目標判定、[shared/status.ts](../../../src/arena/shared/status.ts) 結算狀態與 [shared/rules.ts](../../../src/arena/shared/rules.ts) 規則常數。圓場共用資源在 [shared/resources.ts](../../../src/arena/shared/resources.ts)，卡牌與傷害模組直接共用狀態亂數／補石，不經高層卡牌依賴；固定 seed 指令的關鍵資源 checkpoint 硬基準由舊完整快照投影而非重錄（牌／石順序、RNG／id、付款結果／獎勵、角色 hp／pose／buffs、effects／logs；入場 RNG 另存小型硬基準），見 [arena-resources.test.ts](../../../tests/simulation/arena-resources.test.ts)。圓場核心案例按責任分為卡牌付款／法術（arena-cards）、牌庫／選牌（arena-card-draw）、擊殺獎勵／種族特性（arena-rewards）、投送碰撞（arena-throws）、屎持續傷害（arena-dung）與投送摘要（arena-throw-feedback），各檔連結見 [核心測試導航](../../../tests/simulation/README.md)。模式及瀏覽器測試分類見 [測試導航](../../../tests/README.md)。網頁入口為根目錄 `index.html`，型別設定為 `tsconfig.json`。

## 真相層優先序

下列順序用於描述「目前實作的事實」，不取代使用者需求；實作與已確認需求衝突時應修正實作或釐清需求，不得自行改寫需求。需求與提案的邊界以 [PROJECT](../../../PROJECT.md) 為基準。

```text
code/tests > schema/examples/fixtures > code map > docs > generated
```

- 上層與下層衝突時，**以上層為準並修正下層**。
- generated（產生出來的檔、html）永遠不是唯一真相。
- 原始來源與摘要衝突時，以**原始來源**為準。
- code map 是**導航不是規格**；行為以 code/tests 為準。

## 維護鏈：程式碼 > code map > 文檔

**優先級**（衝突或時間不夠時，依序保持一致）：程式碼 > code map > 文檔。
**code map 與程式碼衝突時以程式碼為準，立刻改 code map。**

1. **修改前**：先讀本表找到相關領域，只讀清單裡的檔——不讀無關領域的檔。
2. **修改後**：新增／刪除了原始碼檔案，或某檔職責顯著改變，必須同步更新本表。
3. 原始碼裡**不加**「對應 code map」的註釋（維護成本過高）；反向查找直接 grep 本檔。
4. 迭代期間本表可暫時落後，**commit 前必須對齊**（見 [feature-dev](../feature-dev/README.md)）。

圓場 runtime 現值集中於 [arena-balance.json](../../../src/arena/data/arena-balance.json)（僅 id／value／unit）；[arena-balance-meta.json](../../../src/arena/data/arena-balance-meta.json) 只存同 id 的來源／決策欄位，不進 runtime import graph 或 build。兩表均為 schema_version=2，由 [metadata 測試與專用 validator](../../../tests/simulation/arena-balance-metadata.test.ts) 驗證各自 id 集合等於 schema；[balance-schema.ts](../../../src/arena/shared/balance-schema.ts) 鎖定 id／型別／單位，[balance.ts](../../../src/arena/shared/balance.ts) 靜態載入並一次驗證，rules／卡牌／sim／items 依原公式取值，scene 起身時鐘共用同一時長。V3 第一切片依74列 candidate_a 暫定遷移，持用武器／象木棍／fury 改 hp 加值、木棍獨立耗體、控制 deadline 串接三秒。文案測試逐處鎖定象木棍加值、HUD 換石預覽、HUD／初始手牌標題、出牌補石及三處抽三選一文字，避免單一位置漂移被其他相同文字掩蓋。現值硬契約與文字一致性分別見 [arena-balance.test.ts](../../../tests/simulation/arena-balance.test.ts)、[arena-copy.test.ts](../../../tests/simulation/arena-copy.test.ts)。

相容性注意：E2E helper 也會在 Node ESM 端直接載入 `src/arena/engine.ts`／`model.ts` 的模組圖，不只經由 Vite。執行期 JSON import 必須保留 `with { type: 'json' }`；Vitest 與 Vite build 通過不代表 Node discovery 相容，仍須由 qa 驗證 Playwright discovery／E2E。

V3 終場在 [sim/engine.ts](../../../src/arena/sim/engine.ts) 停止300秒後新行動，保留在途投送／箭／持傷清算；多人以兩位 hp 整數交叉相乘比較剩餘比例，唯一最高者裁決勝、同分平局，不發擊殺獎勵。`ArenaState.resultReason` 區分殲滅勝／比例勝／平局；HUD 與 log 明示裁決。[shared/format.ts](../../../src/arena/shared/format.ts) 統一既有 hp／傷害數字最多兩位去尾零，血條仍依實值。定向公式／精度／控制見 [arena-v3.test.ts](../../../tests/simulation/arena-v3.test.ts)，清算順序／結果理由／格式及木棍門檻見 [arena-result.test.ts](../../../tests/simulation/arena-result.test.ts)。射程邊界、各武器耗體門檻、零體力移動與倒地恢復見 [arena-v3-boundaries.test.ts](../../../tests/simulation/arena-v3-boundaries.test.ts)。資源硬基準只遷移批准的起始 hp 與 fury 期限，其餘牌石／RNG checkpoint 不變。
