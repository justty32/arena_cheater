# 調查：arena_cheater 的多 agent 分工

2026-11-23，依 [investigation](../../workflows/investigation.md) 工作流。只讀不改；aos 本身怎麼運作不在範圍內。

## 問題

照這個專案實際的工作性質，多 agent 團隊該怎麼分角色：哪些遊戲工作室角色現在就有工作量、哪些太早、哪些可以合併，AI 團隊還需要哪些額外角色，各角色的職責、讀寫範圍、交接介面和模型輕重。

## 方法

- 讀了 AGENTS.md、wf/STRUCTURE.md、wf/WORKFLOWS.md、wf/INDEX.md、wf/workflows/common/（conventions、code-map、user、gotchas）、investigation.md、feature-dev/README.md、testing.md、planning/README.md、plans/cheating-arena.md、specs/cheating-arena-v2.md（部分）、PROJECT.md、README.md、docs/combat-prototype.md（部分）、src/arena/README.md、tests/ 各 README、.github/workflows/pages.yml、wf/import.md。
- 規模：用 `find src tests -type f | xargs wc -l`，再分區用 `wc -c` 量 src/arena、src/game、src/ui、tests/simulation、tests/e2e、wf/。
- 歷史：用 `git log --numstat` 把 50 個 commit 依路徑分到各區，用 python 彙總（commit 類型、每區被碰到幾次、增刪行數）；用 `git log --name-only | sort | uniq -c` 找熱點檔；看了 `git log --merges`、`git branch -a`、commit 時間戳和 commit 本文。
- 驗證：跑 `npm test`；`npx playwright test --list`（只列不跑，因為試玩/瀏覽器同時只准一個 agent 跑）。
- 用 `wf/tools/tabledb.py` 統計需求清單 `cheating-arena-requirements.json` 各 phase／kind 的列數。

## 發現

### 一、專案現況

1. **規模**：src 有 57 檔、約 4,200 行；tests 有 19 檔、約 2,700 行（指令輸出 `wc -l`，總計 7,034 行）。行很長，用 bytes 看比較準：src/arena 214 KB、src/ui 59 KB、src/game 15 KB；tests/simulation 90 KB、tests/e2e 56 KB（指令輸出 `wc -c`）。
2. **模組**：新圓場在 `src/arena/`，大約分三層：模擬層（engine*.ts、model.ts、equipment.ts、geometry.ts，約 55 KB）、互動層（app.ts、hand-view、support-hud、payment-ui 等，約 58 KB）、Canvas 呈現（puppet、thrown-art、area-art、view、layout）。經典 8×8 模式在 `src/game/`＋`src/ui/`，只做回歸維護（src/arena/README.md:6-34；wf/workflows/common/code-map.md:14-19）。從 git 看，經典模式自 10/29 以後只被 1 個 commit 碰過（`baa9956`）。
3. **成熟度**：V2 手牌魔法石三個切片加上後續追加都已落地，現行牌庫 17 種 34 張（PROJECT.md:13；README.md:26）。剩下的範圍：P4 還有 11 種武器／盾、5 個法術、3 個陷阱和狀態互動，另有 3 種鬥士特性，以及 P5 的投注、敵對巫師和平衡（wf/workflows/planning/plans/cheating-arena.md:53）。需求清單共 95 列：P4 26 列、V2 20 列、延期 9 列；依類別算，武器 19、法術卡 19、巫師 7、陷阱 3（tabledb 輸出）。該檔的 status 欄記的是來源成熟度，不代表實作狀態（wf/workflows/planning/README.md:42）。
4. **結構債**：`src/arena/app.ts` 646 行、39.6 KB；`tests/e2e/arena.spec.ts` 807 行、45 KB。兩者都超過「程式碼單檔 > 300 行」的整理門檻（wf/STRUCTURE.md:29；指令輸出 `wc`）。
5. **美術**：全部是 Canvas 程式繪圖，src 裡沒有任何圖檔或音檔，也沒有外部素材依賴（src/arena/README.md:36；docs/combat-prototype.md:61；`find src` 與 `grep audio|sound` 都沒有結果）。使用者給過一份手繪畫面 PDF，目前只採用了版面（docs/design-sources/；specs/cheating-arena-v2.md:37-41）。使用者偏好把圖像／設計交給 `gpt-6-astra`（wf/workflows/common/user.md:18）。
6. **音效**：沒有，需求文件也沒提到（grep 無結果；PROJECT.md 全文沒有出現音效需求）。
7. **數值與文案**：卡牌名稱、費用、說明文字、傷害、射程都寫死在 `src/arena/model.ts` 的 `THROW_PROFILES`（:50）與 `CARDS`（:73）常數裡，沒有獨立的資料檔。很多數值是「可調預設」，不是使用者定案（specs/cheating-arena-v2.md:19-35、:45）。同一套規則還要在 README、PROJECT、docs/combat-prototype.md 和 V2 spec 各寫一次（見發現 13）。
8. **測試與驗證**：分三層：`npm test`（Vitest，11 檔 116 案例，2.16 秒全綠）、`npm run build`（含型別檢查）、`npm run test:e2e`（Playwright，3 檔 20 案例）（指令輸出；wf/workflows/testing.md:10-15）。CI 在 push main 時三層都跑，通過後部署 GitHub Pages（.github/workflows/pages.yml:29-36）。Canvas 美術品質和拖曳手感規定要人工檢視（tests/e2e/README.md:12；testing.md:25），試玩回饋也不能用技術測試取代（testing.md:35）。
9. **wf/ 的份量**：wf/ 不含 aos 共 56 檔、278 KB，其中 wf/tools 117 KB（一次導入的工具）、wf/workflows 145 KB（planning 75 KB）。整個 src 約 288 KB，也就是說流程文件跟原始碼差不多大（指令輸出 `wc -c`）。

### 二、工作流分類與比例（50 個 commit）

10. **commit 類型**：feat 23、fix 14、docs 5、test 2、perf 2、refactor 2、ci 1、chore 1（git log 彙總）。
11. **按工作性質重新分類**（逐一看 commit 標題判斷，屬於人工分類）：
    - **內容切片（新卡、武器、法術、陷阱、基礎原型）12 個，24%**：`248e22d` `64049c7` `f5a54db` `49a290f` `d11e2d9` `07a378f` `1e7810d` `6bac5c4` `d19e980` `f3df5bb` `041678c` `522a033`。
    - **介面、操作、可讀性的功能 11 個，22%**：`6f8c4be` `c6ee6c2` `5b427b2` `94e84e0` `f6410af` `b7d315e` `4884c68` `4f322f4` `3232ccd` `d676304` `2f017b6`。
    - **修正 14 個，28%**：觸控／拖曳／輸入 7 個（`4d53fd5` `cffe126` `79375f1` `81657bd` `29495a6` `e6fa7ad` `6e82afc`）；提示文字、辨識度 6 個（`5ea73e6` `5ba6bd0` `47dd8a1` `29292e5` `c388f8d` `8f3793f`）；規則 1 個（`f18d8af` 暫停出牌，起因是使用者試玩回報，見 PROJECT.md:43）。
    - **純文件 5 個，10%**：`effc6f0` `e69dfc0` `4a3241f` `4cc897f` `6412a61`。
    - **測試整理、效能、重構 6 個，12%**：`895b93b` `dec22a0` `dd5ef11` `764680a` `7eb429e` `baa9956`。
    - **基建 2 個，4%**：`12311b0`（CI）、`cd2e504`（初始化）。

    介面加修正合計一半，比新內容（24%）多一倍。
12. **增刪行數的分佈**（排除 lockfile 1,559 行和一次導入的 wf/tools 1,612 行）：src 6,513 行、tests 4,575 行、文件（docs、根目錄 md、wf/planning、wf 其他）3,916 行。測試的變動量大約是原始碼的七成，文件大約六成（git log --numstat 彙總）。
13. **文件同步稅**：50 個 commit 裡，有 32 個改了 docs/、25 個改了根目錄 md、15 個改了 wf/planning。新增內容的 commit 通常一次改 6 個區域：src/arena、兩層測試、README、PROJECT、combat-prototype.md、V2 spec（例如 `f5a54db` `d11e2d9` `49a290f`；git log 彙總）。
14. **熱點檔**（被改過的 commit 數）：`src/arena/app.ts` 32、`docs/combat-prototype.md` 32、`tests/e2e/arena.spec.ts` 27、`README.md` 25、`src/arena/layout.ts` 24、tests 兩份 README 各 15～16、`PROJECT.md` 15、`arena-cards.test.ts` 14、`model.ts` 13、`engine-items.ts` 13、`code-map.md` 12（指令輸出 `git log --name-only | uniq -c`）。
15. **節奏與整合**：commit 集中在 11/17（22 個）和 11/18（19 個），大約每 15～30 分鐘一個。只有 main 一條線，沒有分支、沒有 merge；作者都是 justty32，commit 沒有本文。11/18 有 13:01、13:22、14:14、15:38、16:12 五組，每組兩個 commit 時間戳完全相同（git log 輸出）。從這點推測是「多個 agent 並行、主 agent 一起整合」，但 git 沒有記錄是哪個 agent 做的，所以這只是推測。
16. **既有的分工慣例**：使用者允許同時開多個 agent，但同一時間只准一個 agent 試玩（user.md:31）。普通工作交給 Sol，簡單工作和雜活交給 Terra（user.md:39），試玩交給 Astra（user.md:31），主 agent 負責和使用者溝通並整合成果（user.md:47）。計畫裡已經寫了「整合者先定共用型別、事件與驗收…同檔只由一人寫」（plans/cheating-arena.md:87-89）。
17. **會卡住的地方**：
    - (a) **熱點檔**：app.ts 和 arena.spec.ts 在大部分介面與內容工作中都會被改到，「同檔只由一人寫」等於把這些工作排成單線（發現 14；plans:87）。
    - (b) **產品文件**：每個 feat 都要同步 README、PROJECT、combat-prototype，這些文件也變成單線（發現 13）。
    - (c) **試玩**：同時只准一個，而且美術和手感不能自動驗證（發現 8、16）。
    - (d) **設計空白要等使用者**：例如狂熱和狂暴是否同義、多個 N 值、豪豬和蛇的特性（specs/cheating-arena-v2.md:45；planning/README.md:51）；plans:75 也明說不讓開發自行定案。但 WAIT_USER 目前是空的（`grep -c` 為 0），實際做法是先用「可調預設」推進，所以使用者沒確認的預設會越積越多。
    - (e) 外部規劃 repo 讀不到，回 404（PROJECT.md:15）。

## 結論

### 角色判定

- **現在就有實際工作量的**：
  - 玩法程式（模擬層）：內容切片佔 24%，P4／V2 還有大量待做。
  - 介面程式：介面和修正合計約一半的 commit。
  - QA／試玩：測試變動量約為原始碼的七成，試玩又是獨佔資源。
  - 策劃：有 46 列待做的需求，加上一串待釐清的空白。
  - 製作人／整合：只有 main 一條線，還要處理使用者授權。
  - 文件維護：32/50 個 commit 改了文件。
- **可以合併的**：
  - 關卡／內容、數值合進策劃。只有一個固定圓場，地形延期，內容幾乎都是卡牌（發現 3、7）。
  - 技術美術先合進負責該切片的程式角色：美術就是 Canvas 程式碼，每把新武器都要配一段繪圖（發現 5）。
  - build／發行合進整合者：CI 已經自動化，push 要使用者每輪授權（發現 8；AGENTS.md 鐵律 2）。
  - 使用者窗口合進製作人：沿用使用者過去的做法（發現 16）。
- **還太早的**：
  - 音效：沒有需求，也沒有任何素材（發現 6）。
  - 關卡設計：同上，只有固定圓場。
  - 專職數值平衡：P5 還沒開始，也沒有批次跑 seed 模擬的工具。git 和 package.json 都沒有這類 script，這點已確認。
  - 敘事文案：PROJECT.md:49 寫明故事背景暫緩。
- **AI 團隊特有、值得加的**：
  - 整合／merge 協調：單一寫入 git 的入口，放在整合者身上。
  - 文件與知識庫維護：可以合進策劃。
  - code review：第二階段再加；目前把關靠 conventions 和測試，但已經出現超過門檻的檔案（發現 4）。

### 建議角色

以下的「模型輕重」只標重／中／輕。Sol、Terra、Astra 各對應哪一級，交給使用者決定。

#### 1. 製作人兼整合者（主 agent、使用者窗口）
- **職責**：和使用者溝通、拆工作派給其他角色、彙整要問使用者的事、驗收、唯一的 git 寫入者（commit／push 照鐵律 2）。
- **讀**：各角色交回的 diff 和回報、PROJECT.md、planning/README.md 的 roadmap。
- **寫**：SESSION-LOG、WAIT_USER、decisions.md、git。
- **交接**：派工時給「切片 id＋spec 段落＋要動哪些檔＋Done when」；收回時要拿到「diff＋驗證指令輸出＋未驗證項目」。
- **模型**：重。context 要廣但不用深，不必讀原始碼全文。

#### 2. 策劃兼文件
- **職責**：把使用者的原文寫成切片 spec，明確分開已確認、提案、已實作；填可調預設並標出來；維護需求清單；在實作驗收後同步產品文件。
- **讀**：docs/design-sources/、PROJECT.md、planning/。
- **寫**：planning/specs、planning/plans、requirements.json（用 tabledb）、README.md、PROJECT.md、docs/combat-prototype.md。
- **交接**：給程式角色切片 spec；給整合者「待使用者決定的問題清單」；接收程式和 QA 的「實際落地行為」回報後才改產品文件。
- **模型**：中到重。最難的是忠於原文，不能自己補完規則。這個角色把發現 17 的 (b) 收成單一擁有者。

#### 3. 玩法程式（模擬層＋內容實作）
- **職責**：寫規則、卡牌效果、裝備、陷阱、狀態，以及對應的 Canvas 物件繪圖（新武器的 puppet 和投擲繪圖）。
- **讀寫**：src/arena/engine*.ts、model.ts、equipment.ts、geometry.ts、puppet.ts、thrown-art.ts、area-art.ts、tests/simulation/、code-map 的該領域列。
- **交接**：從策劃拿 spec；交給介面程式的是「新卡牌的 model 欄位、拒絕原因、事件」；交給整合者的是 `npm test` 和 build 的輸出。
- **模型**：重。要讀的模擬層加上核心測試約 145 KB。

#### 4. 介面程式（UI/UX 實作）
- **職責**：處理輸入、觸控、拖曳、手牌、付款介面、HUD、窄螢幕、提示文案和戰報。
- **讀寫**：src/arena/app.ts、layout.ts、hand-view.ts、view.ts、support-hud.ts、payment-ui.ts、mobile-panels.ts、*.css、tests/e2e/arena.spec.ts。
- **交接**：接收玩法程式的介面欄位；從 QA 拿試玩回報；交給整合者 build 和 e2e 的輸出。
- **模型**：重。單是 app.ts、layout、view 加上 e2e 就約 120 KB。建議第一個任務先照 refactor 工作流把 app.ts 和 arena.spec.ts 拆到 300 行以下，熱點才能分開（發現 4、14）。

#### 5. QA／試玩（同時只開一個）
- **職責**：試玩、截圖做視覺檢視、整理回歸範圍、寫反例測試的需求。
- **讀**：dist/ 或 dev server、tests/e2e/README.md、testing.md。
- **寫**：試玩回報（建議放 `wf/notes/playtest/`，需要整合者同意才開）。只有分派到時才寫 e2e 測試，避免和介面程式同時改同一檔。
- **交接**：回報固定成「重現步驟＋seed＋預期與實際＋截圖」，介面類交給介面程式，規則類交給玩法程式，涉及設計的交給策劃。
- **模型**：中。需要看得懂畫面。

#### 第二階段再開
- **code review**：中。讀 diff、conventions、STRUCTURE 門檻，輸出 review 意見給整合者，不能自己改碼。
- **技術美術**：中到重。P4 開始一次做好幾把武器，或使用者決定換成外部素材時再開。
- **數值平衡**：中。P5 開始、而且有人做出 headless 批次模擬工具以後再開；它會改 model.ts 的常數。
- **雜活**：輕。跑 wf-lint、修連結、整理 code-map 這類事。

### 第一階段

開 1～5 共五個角色。建議的平行方式：玩法程式和介面程式並行；策劃比實作超前一個切片；QA 在每個切片整合後試玩。前提有兩個：先拆 app.ts 和 arena.spec.ts；產品文件只由策劃一個角色寫。

### 缺的證據與沒把握的地方

- git 沒有記錄每個 commit 是哪個 agent、哪種模型做的，所以「過去實際怎麼分工」只能從 user.md 和時間戳推測（發現 15）。
- 14 個修正裡，哪些來自使用者試玩、哪些來自 agent 自測，查不到記錄。所以 QA 角色真正的工作量可能被低估或高估。
- 拆開 app.ts 之後，介面工作能不能真的並行，要等拆完才知道。
- 使用者接下來會不會從 Canvas 程式繪圖改成外部美術素材，目前沒有證據。這會直接決定技術美術和美術要不要提早開。
- 依 investigation 的 Done when，「要動手」的結論應該在 planning 留一列接手記錄。但這次限定只寫本檔，所以沒有加，交給整合者或使用者決定。

## 來源

- 檔案：AGENTS.md；PROJECT.md:13、15、43、49；README.md:26；wf/STRUCTURE.md:29；wf/workflows/common/user.md:18、31、39、47；wf/workflows/common/code-map.md:14-19；wf/workflows/testing.md:10-15、25、35；wf/workflows/planning/README.md:42、51；wf/workflows/planning/plans/cheating-arena.md:53、75、87-89；wf/workflows/planning/specs/cheating-arena-v2.md:19-45；src/arena/README.md:6-36；src/arena/model.ts:50、73；tests/e2e/README.md:12；docs/combat-prototype.md:61；.github/workflows/pages.yml:29-36。
- 指令（2026-11-23，HEAD `6f8c4be`）：`wc -l`／`wc -c`（src、tests、wf）；`git log --numstat`（用 python 彙總）；`git log --name-only | sort | uniq -c`；`git log --merges`；`git branch -a`；`npm test`（11 檔、116 個測試通過）；`npx playwright test --list`（20 個測試）；`python3 wf/tools/tabledb.py …requirements.json`（95 列）。
