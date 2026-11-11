# 瀏覽器測試

以 Playwright 操作真實頁面；執行方式與環境見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 範圍 |
|------|------|
| [arena.spec.ts](arena.spec.ts) | 新圓場八卡、暫停出牌、拖曳／手機滑牌，弓與木棍投送拾取及用量顯示 |
| [battle.spec.ts](battle.spec.ts) | 開局、暫停、倍率、重置、模式、作弊與觸控排版 |
| [effects.spec.ts](effects.spec.ts) | 投射物、目標指示、命中、手機及降低動態效果 |
| [helpers.ts](helpers.ts) | 共用時計與瀏覽器錯誤觀察 |

新原型案例開啟 `/`；`battle.spec.ts` 與 `effects.spec.ts` 使用 `?prototype=classic` 保留舊棋盤回歸。Canvas 畫面的實際美術品質與完整拖曳手感需另作人工檢視，不能由 DOM 斷言推定。
