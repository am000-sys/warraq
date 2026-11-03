#!/usr/bin/env bash
# protect-path.sh: خطاف PreToolUse يحمي مسارات في المشروع من كلود (من مهارة agent-builder).
#
# التسجيل في .claude/settings.json:
#   "matcher": "Write|Edit|NotebookEdit|Bash|PowerShell"
#   "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-path.sh\" create-only:quotes/ lock:robots.txt"
#
# كل وسيط على صيغة  النمط:المسار، والمسار نسبي إلى جذر المشروع:
#   lock:PATH          يمنع كل كتابة أو تعديل أو حذف أو إنشاء.
#   create-only:PATH   يسمح بإنشاء ملف جديد بأداة Write، ويمنع تعديل الموجود أو حذفه.
#   المسار المنتهي بـ / مجلد بكل ما تحته، وغيره ملف بعينه. والوسيط بلا نمط يُعامل lock.
#
# أدوات Write وEdit وNotebookEdit: فحص دقيق للمسار.
# أوامر Bash وPowerShell: فحص احتياطي بالأنماط (> وrm وmv وcp وtee وsed -i وRemove-Item…)
#   يمنع كل أمر يكتب في المسار المحمي أو ينقله أو يحذفه؛ وليس حصراً تاماً.
# رمز الخروج 2 = منع، ونص stderr يصل إلى كلود سبباً للمنع.

input="$(cat)"
proj="${CLAUDE_PROJECT_DIR:-$PWD}"
proj="${proj//\\//}"   # ويندوز: توحيد الفواصل
proj="${proj%/}"

# يستخرج حقلاً من tool_input: بـ jq أو node إن وُجد أحدهما، وإلا بـ sed (للمسارات فقط).
field() {
  local key="$1" val=""
  if command -v jq >/dev/null 2>&1; then
    val="$(printf '%s' "$input" | jq -r --arg k "$key" '.tool_input[$k] // empty' 2>/dev/null)"
  elif command -v node >/dev/null 2>&1; then
    val="$(printf '%s' "$input" | node -e '
      let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
        try { const v = (JSON.parse(s).tool_input || {})[process.argv[1]];
              if (v != null) process.stdout.write(String(v)); } catch (e) {}
      });' "$key" 2>/dev/null)"
  fi
  if [ -z "$val" ]; then
    case "$key" in
      file_path|notebook_path)
        val="$(printf '%s' "$input" | tr -d '\n' \
          | sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1)"
        val="${val//\\\\/\\}" ;;   # فك ترميز الشرطة المائلة المزدوجة في JSON
    esac
  fi
  printf '%s' "$val"
}

block() {
  printf '%s\n' "$1" >&2
  exit 2
}

# يحوّل مساراً إلى نمط ERE حرفي يقبل / أو \ فاصلاً.
to_regex() {
  printf '%s' "$1" | sed -e 's/[][\.*^$+?(){}|]/\\&/g' -e 's#/#[/\\\\]#g'
}

tool="$(printf '%s' "$input" | tr -d '\n' \
  | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"

case "$tool" in
  Write|Edit|NotebookEdit)
    path="$(field file_path)"
    [ -z "$path" ] && path="$(field notebook_path)"
    [ -z "$path" ] && exit 0
    path="${path//\\//}"
    case "$path" in
      /*|[A-Za-z]:/*) ;;
      *) path="$proj/$path" ;;
    esac
    case "$path" in
      "$proj"/*) rel="${path#"$proj"/}" ;;
      *) exit 0 ;;   # خارج المشروع
    esac
    for spec in "$@"; do
      case "$spec" in
        *:*) mode="${spec%%:*}"; target="${spec#*:}" ;;
        *)   mode=lock; target="$spec" ;;
      esac
      case "$target" in
        */) case "$rel" in "$target"*) ;; *) continue ;; esac ;;
        *)  [ "$rel" = "$target" ] || continue ;;
      esac
      if [ "$mode" = "create-only" ]; then
        if [ -e "$path" ]; then
          block "منع: «$rel» محمي (يُنشأ ولا يُعدَّل)، ولا يعدّله إلا المستخدم. لا تحاول تعديله بطريقة أخرى؛ اعرض عليه التصحيح المقترح نصاً."
        fi
      else
        block "منع: «$rel» مقفل، ولا يمسه كلود بكتابة ولا تعديل ولا إنشاء. اعرض التغيير المقترح على المستخدم ليجريه بنفسه."
      fi
    done ;;
  Bash|PowerShell)
    cmd="$(field command)"
    [ -z "$cmd" ] && cmd="$input"   # بلا jq ولا node: يُفحص المدخل كاملاً
    for spec in "$@"; do
      target="${spec#*:}"
      re="$(to_regex "$target")"
      if printf '%s' "$cmd" | grep -Eiq ">[[:space:]]*[^[:space:]]*$re" \
        || printf '%s' "$cmd" | grep -Eiq "(^|[^[:alnum:]_-])(rm|mv|cp|tee|truncate|dd|del|ren|remove-item|move-item|rename-item|copy-item|set-content|add-content|clear-content|out-file)[[:space:]][^;&|]*$re" \
        || printf '%s' "$cmd" | grep -Eiq "(sed|perl)[[:space:]]([^;&|]*[[:space:]])?(-[[:alpha:]]*i|--in-place)[^;&|]*$re"; then
        block "منع: هذا الأمر يكتب في «$target» المحمي أو ينقله أو يحذفه. للإنشاء استعمل أداة Write إن كان المسار يقبل الإنشاء، وللتعديل اعرض التغيير على المستخدم."
      fi
    done ;;
esac
exit 0
