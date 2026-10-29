# testing — 驗證

[WORKFLOWS](../WORKFLOWS.md)｜[INDEX](../INDEX.md)

**何時用**：修改後驗證、重構前記錄基準，或使用者要求測試。
**何時不用**：環境問題走 [dev-env](dev-env.md)，失敗原因調查走 [investigation](investigation.md)。

## 改完必跑

| 變更範圍 | 驗證 | 誰跑 |
|----------|------|------|
| 遊戲邏輯 | `npm test` | agent |
| TypeScript、介面或建置設定 | `npm run build`（含型別檢查） | agent |
| 介面互動、動畫或戰鬥整合 | `npm run test:e2e` | agent |
| 文件 | 相對連結、導航與已確認／提案／實作狀態核對 | agent |

首次安裝與 Chromium 環境見 [dev-env](dev-env.md)。Vitest 只載入 `tests/**/*.test.ts`，瀏覽器案例由 Playwright 另行執行。選用工作流 lint 為 `bash wf/tools/wf-lint.sh --strict .`，使用者要求時才跑。

## 驗證範圍

核心測試位於 `tests/simulation.test.ts`，觀察雙方與四方對戰結算、合法格位與資源範圍、seed 重現、相同遊戲時間的倍速等價、暫停、技能耗能與作弊。無效作弊不得扣資源，有效作弊應改變目標生命、耐力與影響力。投射物案例檢查發射後延遲傷害、暫停續飛、死目標不重複命中，以及雙方最後投射物造成平局。

瀏覽器測試位於 `tests/e2e/`：`battle.spec.ts` 從頁面操作開局、暫停、倍速、重置、模式切換及選取／作弊，檢查勝負顯示與窄畫面；`effects.spec.ts` 檢查箭矢／火球、目標線、投射物暫停及倍速同步、命中與傷害數字，以及手機和降低動態效果偏好的可讀性。共用時計與瀏覽器錯誤觀察放在 `helpers.ts`。測試產物位於忽略版控的 `test-results/` 或 `playwright-report/`。

文件檢查應略過程式碼圍籬中的示範連結及封存內容。既有文件工具可用於核對錨點與大清單，不以未執行的完整 lint 作通過宣稱。

## 驗證原則

測試觀察狀態轉換與結果，不只重述常數或複製實作。隨機 seed 和遊戲時間應可控制，讓失敗能重現；新增驗證器以應成功與應失敗的輸入確認能擋錯。文件小修不另寫鏡像測試。

未跑、不可跑與不適用要分開回報；未做瀏覽器驗證時要說明限制。只將必須由使用者處理的阻礙寫入 [WAIT_USER](../WAIT_USER.md)。試玩回饋用於節奏與平衡調整，不能由技術測試替代。

## Done when

對應範圍的驗證命令回傳 0，文件連結及導航一致；commit 前同步 [code map](common/code-map.md)。若有實際無法執行的驗證，留下具體阻礙與接手方式，不宣稱已通過。

## 交接

驗證後回 [feature-dev](feature-dev/README.md) 同步文件；反覆失敗先走 [investigation](investigation.md)。
