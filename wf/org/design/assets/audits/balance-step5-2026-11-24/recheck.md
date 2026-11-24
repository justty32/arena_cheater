# F01–F03 修正複核

[首次核對](README.md)

依 main 請求 `01795494270897649290.2083177.1423095`，本次只複核三項修正，不重做 198 列全表審核。結論：DONE，F01、F02、F03 均解除。

## 複核結果

F01：`arena-copy.test.ts` 現以限定 elephant case 的正規表示式擷取百分比，將 20 與 `(B.elephantClubMultiplier - 1) * 100` 用 `toBeCloseTo` 比較；可攔下文字與倍率不一致，也避開浮點精確相等問題。

F02：七個位置各有獨立測試，限定來源與所在結構，沒有只靠同檔任意位置的 `toContain`：HUD 換石預覽、HUD 手牌標題、layout 手牌標題、layout 出牌補石說明、layout 付款鈕、layout 卡片副標、payment-ui 付款動作。換石數字捕捉後直接對 B.redrawBonus；中文數字分別鎖三／兩並對 B.initialHand、B.playStones、B.deliberateCount。逐一讀取斷言和現行來源，符合本次要求；單一位置數字改錯會使對應捕捉或值斷言失敗，不會被其他位置的相同字串掩蓋。

F03：兩列 `card.lightning-rain.areaRadius` 與 `card.divine-wrath.areaRadius` 仍為 1.5 m／2.5 m；rationale 已明記半徑非直徑、施法圓心至鬥士中心距門檻、不加鬥士碰撞半徑，符合 `shared/targeting.ts` 的 `areaSpellTargets` 公式。句中「。；」為標點瑕疵，不影響契約語義，非阻擋項。

## 證據與邊界

本次直接以 tabledb API 讀取兩列，並讀取測試與對應來源。dev 的 `design-fixes-metadata.json` 表示只有兩列 rationale 變更；本次不另宣稱已獨立重核其餘 196 列。

受查 `tests/simulation/arena-copy.test.ts` SHA-256：`c321143a8e611274789b2f58e98c5a15e57ba724f80134f3c33ccafcef8f18f9`。

受查 `src/arena/data/arena-balance.json` SHA-256：`6a2f35533a41028bcaf0f70fd6394676ecc45b69a5494be6ccba886088d3ed7a`。

只做靜態複核，未執行 Node、核心測試或變異測試；實跑驗證由 dev／review／QA 交接，不以本報告代替。首次 findings.json、rows.json、inverse.json 保留原審核快照，不覆寫歷史證據。
