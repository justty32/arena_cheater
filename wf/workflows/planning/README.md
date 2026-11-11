# planning — 想法、規格與開發計畫

[WORKFLOWS](../../WORKFLOWS.md)｜[INDEX](../../INDEX.md)

**何時用**：記想法、排 roadmap、討論方案或寫動工計畫。
**何時不用**：已有計畫並動工走 [feature-dev](../feature-dev/README.md)；窄問題調查走 [investigation](../investigation.md)。

## Done when

idea／roadmap 的對應列已建立或更新；詳細規劃有方案／取捨 spec 與步驟／驗證 plan，來源要求與提案分明。實作完成後才封存對應計畫；文件寫完不算實作完成。

## 流程

先記想法，確定方向後排 roadmap，再依 spec／plan 開發。已確認需求見 [PROJECT](../../../PROJECT.md)，實際可玩內容見 [戰鬥原型](../../../docs/combat-prototype.md)。本輪使用者已授權邊規劃邊做與快速 UI 切片，細項數值可先採標明的可調預設。

## 內容

<!-- wf-nav -->
| 文件 | 用途 |
|------|------|
| [玩法規格](specs/cheating-arena.md) | 圓場七鬥士、卡牌干預、裝備與狀態、方案取捨 |
| [演出規格](specs/visuals.md) | 2D 45° 俯視、Canvas 素材、骨架與紙娃娃 |
| [分期開發計畫](plans/cheating-arena.md) | 已落地切片、目前階段、剩餘範圍與驗收 |
| [需求原文](../../../docs/design-sources/cheating-arena-2026-11-11.txt) | 使用者提供的逐字文字，僅正規化換行 |

需求／內容清單已抽到 [cheating-arena-requirements.json](data/cheating-arena-requirements.json)（60 列）；不在 Markdown 留表格副本。

`id`：穩定編號。

`kind`／`name`：內容類型與原名。

`source`：原文依據；多個片段用分號串接。

`phase`／`status`：建議階段與來源成熟度，不表示已實作。

`acceptance`／`note`：預期行為驗收、暫定解讀及快版差距。

統計：13 項基礎、7 種鬥士、15 種武器／盾、9 種法術、3 種陷阱、4 項追加視覺；另有 4 種野獸與 5 種地形明確延期。51 列未延期，其中 3 列鬥士特性仍待定；9 列延期。

## 想法與 roadmap

| 事項 | 順序／狀態 | 前提 |
|------|-----------|------|
| 詐賭競技場快版 | 已落地並獲試玩接受 | 七人混戰、基本卡牌與暫停出牌保留 |
| P3 裝備戰與防禦 | 已落地 | 弓、木棍耐久／擊飛、雙手槽、招架與投送掃掠 |
| P4 完整內容與 P5 平衡 | 後續 | 其餘武器、法術與陷阱，投注細節仍待定 |
| 三名鬥士尚缺的特性 | 待設計 | 保留原名，不擅自補特性 |
| 裁判風險／被抓後果 | 舊提案暫緩 | 新稿聚焦公開場邊介入，不自動沿用 |
| 野獸與地形法術 | 明確延期 | 使用者原文先不要生成 |

舊「擴充職業與招式」候選改以本次七鬥士及卡牌規格承接；未承諾日曆排程。故事、連線、帳號、持久養成與完整下注經濟不因本次切片自動納入。

## 交接

決定記 [decisions](../decisions.md)。真正待使用者解除的阻礙才記 [WAIT_USER](../../WAIT_USER.md)，跨 session open 進度記 [SESSION-LOG](../../SESSION-LOG.md)。驗證依 [testing](../testing.md)，完成後清 open 狀態。
