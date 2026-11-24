# src 模組責任制

[開發角色卡](../README.md)｜[程式導航](../../../workflows/common/code-map.md)

dev 負責契約、派工、整合與回報。依據 app.ts 拆分（64a7e87）及捕獸夾 diff，分五塊責任、最多四席；第一階段僅啟用 dev-items 一席，其他塊及經典模式由主管暫代。下屬定義由 main 維護，每輪寫入仍以任務租約為準。

## 模組與介面

路徑相對專案根；大括號代表明列檔案，新檔由 dev 指定 owner。測試均在 tests/simulation/ 下。

### 核心模擬：dev-sim

擁有 `src/arena/{engine,engine-combat,engine-damage,engine-arrows,geometry}.ts`。負責固定步進、戰鬥／控制、傷害歸屬、死亡、收尾與掃掠幾何。對外入口為 createArena／advanceArena／toggleArena；內部向道具塊提供 applyHealthDamage／damageFighter／advanceControl 等既有函式。

擁有 arena.test.ts、arena-p3.test.ts、arena-root.test.ts。engine.ts 出口與步序改動須 dev 核准，此 owner 落筆。engine-damage 的擊殺補石直接取主管保管的 shared/resources.ts，不依賴 engine-cards。

### 卡牌與道具：dev-items

擁有 `src/arena/{engine-cards,engine-items,engine-traps,equipment}.ts`。負責牌庫／石頭／付款、施放原子性、投送拾取、地面陷阱的武裝／壽命／觸發。對外使用 playCard／validateCardPlay／paymentStatus／findPayment／previewThrowContact；

擁有 arena-cards.test.ts、arena-card-draw.test.ts、arena-rewards.test.ts、arena-area.test.ts、arena-throws.test.ts、arena-dung.test.ts、arena-throw-feedback.test.ts、equipment.test.ts、arena-traps.test.ts、arena-bear-trap.test.ts。共享 setup arena-test-fixtures.ts 由 dev 指定才寫。跨塊呼叫不代表取得對方寫權；新增卡牌表項走主管管理的 shared/card-catalog.ts。

### 場景與繪圖：dev-scene

擁有 `src/arena/{view,puppet,animation,projection,label-layout,area-art,thrown-art}.ts`。負責 Canvas、投影／命中選取、卡面繪圖原語與時鐘取樣。對外維持 ArenaView 的 render／選取與座標 API、project／unproject 與 draw 系列函式。

擁有 projection.test.ts、label-layout.test.ts。目前沒有 Canvas 美術品質單元驗收，不以 build 成功當視覺通過，交 qa 真 UI 驗證。

### 介面與輸入：dev-ui

擁有 `src/arena/{app,arena-session,arena-hud,fighter-details,card-actions,arena-input,arena-controls,arena-loop,layout,hand-view,support-hud,mobile-panels,throw-feedback,payment-ui}.ts` 與 `src/arena/{arena,hand,mobile}.css`。版面與行動版合併：DOM、手牌、輸入與 CSS 高度耦合，不另拆下屬搶檔。

對外是 mountArena；內部契約為 ArenaSession／ArenaContext 及各 create* 工廠。命令走 engine.ts API；UI 預覽直接讀 shared/targeting 的合法目標判定，不能以自行算費／本地計時取代引擎重驗。layout.ts 歸 UI；scene 只交繪圖函式契約。

無專屬 DOM 核心測試；卡牌模擬不等於 UI 驗證。瀏覽器及桌面／320／390 px 試玩歸 qa，dev-ui 提供接線。

### 經典模式：dev 暫代 owner

擁有 `src/classic.ts`、`src/game/**`、`src/ui/**`；邊界是 classic 入口與其 BattleState／BoardView／InterfaceView，與 arena 不混用規則。對應 battle.test.ts、potion.test.ts、projectiles.test.ts、helpers.ts。有經典切片才以空席載入專用定義。

## 主管保管的共用契約

`src/arena/shared/resources.ts` 的狀態亂數／色序／補石及 arena-resources.test.ts 的完整狀態快照由 dev 保管。`src/arena/model.ts` 相容入口及 `src/arena/shared/{types,card-catalog,targeting,status,rules}.ts` 由 dev 獨佔，分別管理型別、卡牌表、合法目標、結算狀態及規則常數；內部直接引用來源，不繞相容入口。`src/main.ts` 的模式路由、`src/arena/README.md`、`tests/simulation/README.md`、code-map 也由 dev 整合維護。跨塊驗收檔 arena-bear-trap-integration.test.ts 由 dev 擁有。不是多人任寫的共用區；其餘 src 均在上述五塊。

新增介面由 owner 提案，寫清參數、輸出、狀態副作用、時間基準與呼叫順序，dev 在原 spec 範圍內決定技術契約。改到玩法語義或規格空白，仍交 main／design，不以主管身份代使用者拍板。

## 跨塊切片怎麼做

dev 先列驗收與 touched files，分配唯一寫手和階段性檔案租約；owner 是長期責任，不是可以隨時寫的授權。任務書必須列本輪精確可寫檔、可讀來源、依賴版本及停止條件。

先由 dev 落模型與函式簽名，再讓兩個無重疊檔案集合並行。提供者先實作共用服務，消費者依確認的契約接線；例如陷阱 owner 改名後，核心 owner 才更新 engine.ts 的 import／步進。跨 owner 的小改也須交 owner 或暫借租約。

dev 檢查 diff 與租約、補整合測試、同步導航後，凍結相關寫入再跑一次完整 arena_verify(all)。同一工作樹驗證的是當時所有變動，不是某下屬的獨立分支；有人仍在寫就不把結果當切片證據。失敗先按責任回派，清理失敗先停後續 Node，不繞過工具。通過後只由 dev 回 main，review／qa／integration 流程不變。

## 下屬最小定義草稿

四個 arena 定義預計命名為 `wf/aos/defs/dev-{sim,items,scene,ui}/`，由 main 建立；本文件不是寫入該目錄的授權。共同 system 指向本提案與 dev 角色卡，工作區為專案根；可讀 src／tests、規格與必要導航，可寫僅本塊本輪租約檔和 `/tmp/aos/arena_cheater/dev/<owner>/`。不得寫別的部門、wf/aos 或 E2E；不得 commit／push／切分支、啟動 server、Playwright 或試玩。

共同工具白名單建議只給 read、ls、glob、grep、stat、edit、write、mailbox_peek/read/send、board_read/set、arena_verify。不給 shell、run_python、self_tools、self_hook、subagent、agents_ctl、agent_def、任意命令工具或可修改自己設定的工具。驗證 log 指到本塊暫存目錄；不設 limits.mem_mb。arena_verify 由定義預先掛載，不讓下屬自行註冊工具。共用路徑仍須以任務書約束，這是防失誤而非 OS 沙箱；edit/write 也有任意路徑能力，不能宣稱硬隔離。

四份定義分別綁上述檔案／測試／介面，不繼承完整 dev 再刪權。完成回 dev：改動、契約、測試理由與風險；固定驗證不另開 agent。

驗證一律 arena_verify；目前工具不能只選某測試檔，step=test 仍是完整 npm test，step=build 是完整 build。下屬若需驗證先向 dev 申請排隊與凍結寫入，dev 盡量合併需求，最後自己跑 all。不因四個 owner 同時各跑一份增加等待。工具失敗照實回報，不改 shell 跑 npm。

常駐保留 stack，切片間停工／休眠；新切片仍重讀 git、任務與契約。四席是上限；現行角色卡第一階段只准一個，升到兩個以上須 main 先同步角色卡。

## 用捕獸夾驗證切法

dev 先修改 shared/types.ts 的卡種／GroundTrap／rootedUntil，鎖定傷害歸屬、觸發順序與時鐘契約。items owner 改 engine-items／engine-traps，補 bear-trap 與 traps 測試，調整 arena-cards 的牌數守恆；sim owner 改 engine-combat 的自主平移限制、engine-damage 的死亡清理及 engine.ts 陷阱接線，補 root 測試。兩塊先約好 placeTrap／advanceTraps／trapMovementStart，避免各建一套流程。

scene owner 加 area-art 捕獸夾圖形、view 的陷阱分派與不覆蓋 pose 的定身標示；ui owner 在 layout 接卡面、fighter-details 接倒數。scene 先交 drawBearTrap 簽名，ui 再接 layout，兩者不搶 layout.ts。

dev 最後補 bear-trap-integration 測試與三份導航，合併驗證後交 main。本輪由單一 dev 完成，162 案與 build 通過不是分工效率證據。上一輪 app 拆分的接縫這次未動，支持先不拆散 UI owner。

## 風險與試行

主要風險是共享工作樹看見半成品、model／engine.ts 接縫成瓶頸、舊上下文誤判，以及下屬驗證排隊。測試可能橫跨模組，只有指定 owner 可寫，其他 owner 交案例建議給它。

首次試行採 simulation 熱點拆分：dev-items 僅搬 cards／throws 案例至指定測試檔，保留完整 title 與斷言；dev 承擔核心、UI、導航、審核與統一驗證，符合現行第一階段限制。記錄跨檔移交次數、契約返工、Node 等鎖時間、review 缺陷和主管整合時間。完成一輪後，若任務確有互不重疊的畫面工作且 main 核准更新限制，再試 items＋scene 兩個；不先開滿四個，也不因 agent 空閒而製造工作。
