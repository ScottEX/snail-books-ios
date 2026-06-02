#!/bin/bash
# check-web-changes.sh
# 查看 snail-books-web 最近改了哪些文件,辅助 iOS 同步决策
#
# 用法:
#   ./scripts/check-web-changes.sh        # 最近 7 天
#   ./scripts/check-web-changes.sh 3      # 最近 3 天
#   ./scripts/check-web-changes.sh 30     # 最近 30 天
#
# 输出:
#   - web 最近 N 天的 commit 列表
#   - 改过的 src/ 文件(按出现频率排序)

set -e
WEB_REPO="/Users/lanx/projects/snail-books-web"
IOS_REPO="/Users/lanx/projects/snail-books-ios"
cd "$WEB_REPO"

DAYS="${1:-7}"
SINCE="${DAYS} days ago"

echo "=== web 最近 ${DAYS} 天的 commits ==="
git log --since="$SINCE" --oneline 2>/dev/null

echo ""
echo "=== 改过的文件(去重) ==="
git log --since="$SINCE" --name-only --pretty=format: 2>/dev/null \
  | grep -v '^$' \
  | sort \
  | uniq -c \
  | sort -rn

echo ""
echo "=== web 改了但 iOS 没有的文件 ==="
git log --since="$SINCE" --name-only --pretty=format: 2>/dev/null \
  | grep -v '^$' \
  | sort -u \
  | while read f; do
      if [[ "$f" == src/* ]] && [ ! -f "$IOS_REPO/$f" ]; then
        echo "  [iOS 缺] $f"
      fi
    done

echo ""
echo "=== iOS 独有(可能是 iOS 特定代码) ==="
for f in $(cd "$IOS_REPO" && find src -type f 2>/dev/null); do
  if [ ! -f "$WEB_REPO/$f" ]; then
    echo "  [iOS 独有] $f"
  fi
done
