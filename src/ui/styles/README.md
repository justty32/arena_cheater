# 全站與面板樣式

[base.css](../base.css) 是載入入口，依下列順序組合樣式；維護時保留層疊順序。棋盤及戰鬥特效仍由同層的 [board.css](../board.css) 和 [effects.css](../effects.css) 負責。

| 檔案 | 職責 |
|------|------|
| [globals.css](globals.css) | 色彩變數、字體、元素重設與共用圖示 |
| [shell.css](shell.css) | 頁首、標題、主要欄位與共用面板結構 |
| [setup.css](setup.css) | 模式選擇、陣營列表與觀戰說明 |
| [panels.css](panels.css) | 角色狀態、作弊、戰報、頁尾及可見性工具 |
| [responsive.css](responsive.css) | 各斷點的版面與面板調整 |
