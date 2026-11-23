# 瀏覽器測試

以 Playwright 操作真實頁面；執行方式與環境見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 範圍 |
|------|------|
| [arena.spec.ts](arena.spec.ts) | 新圓場手牌、付款、謹慎思考、直覺與換石冷卻 |
| [arena-delivery.spec.ts](arena-delivery.spec.ts) | 暫停投送、拖曳與 Esc 中斷、裝備拾取與射程投擲 |
| [arena-spells.spec.ts](arena-spells.spec.ts) | 名單／場上施法、範圍法術滑鼠與觸控預覽 |
| [arena-results.spec.ts](arena-results.spec.ts) | 結算層事件 fixture、真實結算、重試與新局 |
| [arena-mobile.spec.ts](arena-mobile.spec.ts) | 手機付款、換石、原生捲動、支持者與控制 |
| [arena-helpers.ts](arena-helpers.ts) | 新圓場 setup、選牌、投送與 seed 搜尋 |
| [arena-traps.spec.ts](arena-traps.spec.ts) | 捕獸夾三寬暫停付款、續戰定身與解除、完整結算重試、窄屏觸控預覽與捲動取消 |
| [battle.spec.ts](battle.spec.ts) | 開局、暫停、倍率、重置、模式、作弊與觸控排版 |
| [effects.spec.ts](effects.spec.ts) | 投射物暫停／續飛、命中資訊及降低動態效果 |
| [helpers.ts](helpers.ts) | 共用時計與瀏覽器錯誤觀察 |

新原型案例開啟 `/`；`battle.spec.ts` 與 `effects.spec.ts` 使用 `?prototype=classic` 保留舊棋盤回歸。Canvas 畫面的實際美術品質與完整拖曳手感需另作人工檢視，不能由 DOM 斷言推定。
