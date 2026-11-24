#!/usr/bin/env python3
"""tool-python 骨架 - 最小、合格、能跑的工具：把兩個數相加。抄出去改 @fn.tool 底下那個函數（名字、docstring、參數、內容）就是新工具（說明看 README.md）。"""
# ---- setup: find the aos package (keep these lines as they are) ----
import os, sys
sys.dont_write_bytecode = True
_d = os.path.dirname(os.path.realpath(__file__))
_found = [_d]
if os.environ.get("AOS_HOME"):
    _found.append(os.path.join(os.environ["AOS_HOME"], "lib"))
sys.path[:0] = _found
try:
    from aos.py import fn
except ModuleNotFoundError as _e:
    if _e.name != "aos":
        raise
    if os.environ.get("AOS_HOME"):
        _line = "%s: error: ModuleMissing %s not found (under $AOS_HOME/lib, or next to tool.py)\n" % (os.path.basename(_found[0]), _e.name)
    else:
        _line = "%s: error: HomeMissing AOS_HOME is not set (set it, or copy the %s package folder next to tool.py)\n" % (os.path.basename(_found[0]), _e.name)
    sys.stderr.write(_line)
    sys.stdout.write(_line)
    sys.exit(1)
# ---- your tool ----
import subprocess
from check import run


@fn.tool(meta={"side_effect": False, "deterministic": False, "timeout_ms": 120000})
def review_move_check(repo: str, base: str = "HEAD", target: str = "WORKTREE", scope: str = "src/arena", moves: dict = {}) -> dict:
    """唯讀比對 commit 與工作樹或兩個 commit：移動本文、出口提示、引用、循環與缺失。只提供詞法證據，不表示審查通過。

    Args:
      repo: 專案根目錄的絕對路徑。
      base: 舊 commit 或 revision；不可使用 WORKTREE。
      target: 新 commit 或 WORKTREE。
      scope: 納入圖及比對的 repo 相對目錄；預設 src/arena。
      moves: 舊路徑對新路徑的明確 mapping；未指定時依唯一同 basename 推測，仍需人工確認。
    """
    try:
        return run(repo, base, target, scope, moves)
    except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
        fn.fail("CheckFailed", str(error))


fn.main(review_move_check)
