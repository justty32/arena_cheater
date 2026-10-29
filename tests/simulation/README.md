# 戰鬥模擬測試

不依賴瀏覽器的核心行為回歸；執行方式與驗收範圍見 [testing](../../wf/workflows/testing.md)。

| 檔案 | 驗證範圍 |
|------|----------|
| [battle.test.ts](battle.test.ts) | 完整對局、格位與資源、seed、倍速、暫停與動作耗能 |
| [potion.test.ts](potion.test.ts) | 藥劑有效／無效目標、資源邊界及勝負影響 |
| [projectiles.test.ts](projectiles.test.ts) | 飛行延遲、暫停、死目標與最後投射物結算 |
| [helpers.ts](helpers.ts) | 共用時間步進與雙角色情境 |
