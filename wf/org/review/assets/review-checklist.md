# 審查清單

- 取消、啟動及清理失敗時，鎖與後續步驟是否符合[故障矩陣](../../letters.md#開工信request一定要寫的)？
- 純搬移是否逐字比對案例及 helper，無漏增、重複或 setup／斷言變動？依據：[重構驗證](../../../workflows/testing.md)、[行為不變慣例](../../../workflows/common/conventions.md)。
- 搬檔後是否核對一般 import／re-export、動態 import 與內嵌 `import('…')` 型別路徑，包含未改消費端的目標存在性、符號來源及相容出口？依據：[介面與行為不變慣例](../../../workflows/common/conventions.md)。
- 新增同類項目時，是否用 `rg` 搜尋既有名稱／識別字及共用分支，連未改檔的提示、預覽、回饋與消費端一起核對，並以新舊項目斷言防止名稱誤用？依據：[介面變更慣例](../../../workflows/common/conventions.md)。
- 單檔是否超過 300 行，測試是否驗行為而非重述常數？依據：[角色卡](../README.md#職責)。
- 工具是否接受任意指令／路徑，實際能力是否超出宣告？依據：[權限調查](../../../notes/investigations/aos-permissions.md)。
