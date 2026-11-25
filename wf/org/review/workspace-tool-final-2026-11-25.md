# arena_verify workspace 最終複審（2026-11-25）

結論：通過，無新增阻擋意見。依 dev 請求 01795567310028848339.379551.277473，以及信中 main 授權改採 src/tests 全面拒絕 symlink 的決定；審查範圍仍為 arena_verify 的 tool.py、test_tool.py、README.md、_tooldef.json。

## F01／F02 結清

F01：根目錄 vite.config.*、vitest.config.*、tsconfig*.json 集合與內容比對維持，額外高優先設定拒絕。F02：src/tests 根及掃描到的所有 entry 都以 is_symlink 拒絕；因此內部目錄 symlink 在第一段就拒絕，不需跟隨而產生循環，也不再漏檢第二段外部來源。README 明訂連內部目標也不能 symlink；副本根目錄別名 resolve 後可接受，node_modules 共享不受這次來源檢查影響。

獨立重跑九個原 mock 全數通過，包含設定、直接與二段逃逸、內部檔案 symlink、根目錄別名，以及 cleanup gate。另將前次成功繞過的 src/arena -> workspace/shared-arena -> 主 repo 來源重現程式改為驗證拒絕，確實 ArgumentsBad 且 launcher 呼叫零次。測試只在記憶體將 dev 暫存與 lock 路徑改到 review 暫存，Popen／subprocess.run 均 mock；未跑 Node、未動全機鎖、未改作者檔案、未開下屬。

## 其餘契約與證據

預設空 workspace、固定 npm test／npm run build、node.lock、systemd scope 的 4G／400%／256、cleanup gate 與上一輪相同，未發現新回歸。新增 result.json 保存清理證據的實作維持。tool.py 為 228 行、test_tool.py 為 164 行，均未超過 300；git diff --check 通過。

上一輪已親讀 `/tmp/aos/arena_cheater/dev/v3-logs/a-reviewed-final/verify-rb9fangc/` 的三份證據：副本專屬 clubBonus=3 sentinel、candidate contract、100 局報告三案與 build 成功，兩步 exit_code=0、scope_cleaned=true、無 cleanup_error。此輪只收緊 symlink gate，正常無 symlink 的 archive 副本仍適用該實跑證據；未將先前誤填 sentinel=2 的失敗 log 當成成功，也不宣稱 V3 數值／全套回歸已通過。

獨立證據：`/tmp/aos/arena_cheater/review/workspace-review/finalcheck.py`、finalcheck.log、final-evidence.json。範圍仍是防誤用而非惡意同 uid 安全沙箱；來源執行程式與並行置換等既有 README 限制不變。公告欄 notice／wall 仍不存在。可依 aos 工具批次流程交 integration，無需 QA。
