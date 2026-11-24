# 測試 `qa`

[org](../README.md)

唯一可以啟動遊戲、試玩、跑瀏覽器測試的部門。它負責守住「同一時間只有一個 agent 試玩」這條規矩。

## 職責

- **負責**
  - 跑 `npm run test:e2e`，做畫面檢視和試玩。
  - 寫和維護 `tests/e2e/`。
  - 把發現的缺陷整理成回歸案例。
  - 照 [testing](../../workflows/testing.md) 的流程做。
- **不負責**
  - 修程式：缺陷寄給 dev。
  - 改核心測試：寄信請 dev 加。
  - 決定手感和平衡：觀察寄給 design。
- **E2E 用工具**：跑 E2E 一律用 aos 工具 `arena_e2e`。它會先做預檢、建乾淨副本，再拿 Node 鎖，在 systemd scope 裡跑，資源上限是 4G 記憶體、400% CPU、256 個 task，結果用 JSON 回傳，也可以和基準比對。不要在 shell 裡直接跑 Playwright。工具的說明在 `wf/aos/tools/arena_e2e/README.md`。
- **Done when**：驗證指令回傳 0，或者已經寄出缺陷報告。回報要寫清楚哪些驗證沒跑、哪些不能跑、哪些不適用，三種分開列。

## 讀寫範圍

- **可以寫**：`tests/e2e/`、`wf/org/qa/`。另外，Playwright 跑測試時會自動寫 `test-results/`，這個也算在你的範圍裡。
- **唯讀**：`src/`、`tests/simulation/`、`wf/org/design/assets/`，驗收條件在 design 的資產庫裡。
- **資產庫**：還沒建立。第一份要長期保留的產出會是回歸案例清單 `assets/regression-cases.json`，格式照 `wf-table/1` 契約。每一列指向對應的測試檔，或標明「手動」。清單只做索引，不重複測試本身的內容。
- **暫存**：`/tmp/aos/arena_cheater/qa/`，截圖和試玩紀錄放這裡。`test-results/` 不進版控。

## 交接

| 收到誰的什麼信 | 要做什麼 | 做完回給誰、信裡要有什麼 |
|----------------|----------|--------------------------|
| main 的 REQUEST：要驗的變更範圍 | 跑 e2e、做畫面檢視、試玩 | 通過就回 DONE 給 main。有缺陷就回 FAILED，附上步驟、seed、預期和實際結果 |
| main 的 REQUEST：重構前的基準，要給一個 commit | 在那個 commit 的乾淨副本上跑 e2e | 通過就回 DONE，有失敗就回 FAILED；跑不起來是環境問題，回 BLOCKED |

- 驗收時不一定要等 review 先結束。純驗證不改檔，可以和 review 同時做；要不要同時，看 main 的信怎麼寫。
| dev 想動 `tests/e2e/` | 講好範圍，或自己動手改 | DONE 給 dev |

- 手感和平衡的觀察，另外寄一封 PROGRESS 給 design。

## 保存的基準

架構整理使用 [e2e-193affd.json](assets/baselines/e2e-193affd.json)：commit `193affd8d83892195600967f7f37c00ec3ef2c8a`，25 案全綠，含 `title_path`／`project`。`arena_e2e` 的 baseline 目前只接受 qa 暫存區內的檔案；使用前將此檔複製到 `/tmp/aos/arena_cheater/qa/baselines/e2e-193affd.json`，再以該絕對路徑配合 `comparison_mode: "title_project"` 比對。保存檔內的 artifacts 路徑是原執行紀錄，不保證重開機後存在；比對只需 cases，不會重跑基準。

## 踩坑：開場白頁與網路事件

開場白頁、canvas 尚未掛載時，先查失敗 `trace.zip` 的 pageError 與 network，不把等待逾時直接歸因於負載或程式回歸。若模組請求明確記錄 `response._failureText=net::ERR_NETWORK_CHANGED`，依 main 的驗收判定歸為主機網路事件；這不代表已查明是哪個介面或服務造成。

處理方式是保留失敗證據，不改 timeout／測試，對同一個 workspace fingerprint 重跑一次；回報同時附兩輪 result.json、fingerprint、trace 錯誤及比對結果。同一案例連續兩次出現，或錯誤不是 `ERR_NETWORK_CHANGED`，就升級給 main，不自動忽略。重跑全綠時由 main 確認採用重跑結果驗收。

2026-11-24 架構 4b：同 fingerprint `f29674c6c81264fe47cce73b845b3f3d6e1cef85ad8f718951e5640356f6c8c8` 首輪 24/25，trace 中 12 個模組請求遭 `ERR_NETWORK_CHANGED` 中斷，未見 HTTP 4xx/5xx；重跑 25/25，title_project 與基準一致。main 採重跑結果驗收，不採原先「轉譯過慢」假設。暫存證據 run 分別為 `e2e-4349c5ce5931414a88a70c663997edc8`、`e2e-6f1221452ac3420197d77288f43515c2`（位於 qa 暫存區，不保證永久存在）。

## 模型

- **參考設定**：`sol`。只是跑指令回報結果時，可以改用 `terra`。
- **同時可以開幾個**：只能 1 個。使用者規定同一時間只能有一個 agent 試玩。
