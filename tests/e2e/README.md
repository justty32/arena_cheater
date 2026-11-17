# 瀏覽器測試

以 Playwright 操作真實頁面；執行方式與環境見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 範圍 |
|------|------|
| [arena.spec.ts](arena.spec.ts) | 新圓場三牌三石、實例與鍵盤自選付款、暫停出牌、換石冷卻、拖曳／手機一屏付款／換石與固定支持者HUD、代表性裝備拾取、射程投擲與範圍法術預覽／點地接線、結算層觸控重定向工程事件fixture |
| [battle.spec.ts](battle.spec.ts) | 開局、暫停、倍率、重置、模式、作弊與觸控排版 |
| [effects.spec.ts](effects.spec.ts) | 投射物暫停／續飛、命中資訊及降低動態效果 |
| [helpers.ts](helpers.ts) | 共用時計與瀏覽器錯誤觀察 |

新原型案例開啟 `/`；`battle.spec.ts` 與 `effects.spec.ts` 使用 `?prototype=classic` 保留舊棋盤回歸。Canvas 畫面的實際美術品質與完整拖曳手感需另作人工檢視，不能由 DOM 斷言推定。
