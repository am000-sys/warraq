#!/usr/bin/env python3
# scripts/build-quran-from-tafsir-db.py
#
# يبني ملفّ النصّ المرجعيّ src/data/quran-uthmani.json من قاعدة بيانات tafsir-mcp
# (مركز تفسير للدراسات القرآنيّة) — نصّ الرسم العثمانيّ المعتمَد علميّاً.
#
# لماذا؟ المُصحِّح (src/lib/quran-correct.ts) يقرأ quran-uthmani.json بالبنية
#   { surahs: [ { n, name, ayat: [..] } ] }
# هذا السكربت يُعيد توليد الملفّ بنفس البنية تماماً من المصدر المعتمَد، فلا يتغيّر
# أيّ سطر في كود المُصحِّح.
#
# الرسم العثمانيّ يُعاد بناؤه من جدول word_content_rasm (نفس منطق reconstruct_ayah
# في خادم tafsir-mcp): ترتيب الكلمات حسب wordNo ثمّ وصلها بمسافة.
#
# الترخيص: بيانات القرآن في tafsir-mcp تحت CC BY 4.0 — تستوجب نسبة المصدر إلى
#          «مركز تفسير للدراسات القرآنيّة». النسبة مُضمَّنة في رأس الملفّ المُولَّد.
#
# الاستعمال:
#   python3 scripts/build-quran-from-tafsir-db.py [/path/to/quran.db]
#   # أو عبر متغيّر البيئة:
#   TAFSIR_DB_PATH=/path/to/quran.db python3 scripts/build-quran-from-tafsir-db.py
#
# مصدر quran.db (~214MB): يُحمَّل تلقائيّاً عند أوّل تشغيل لـ tafsir-mcp إلى
#   ~/.cache/tafsir-mcp/quran.db ، أو من مستودع البيانات على Hugging Face.

import json
import os
import sqlite3
import sys
from pathlib import Path

EXPECTED_SURAHS = 114
EXPECTED_VERSES = 6236

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "data" / "quran-uthmani.json"

SOURCE_LABEL = (
    "tafsir-mcp @ مركز تفسير للدراسات القرآنيّة — الرسم العثمانيّ المعتمَد "
    "(word_content_rasm). البيانات تحت رخصة CC BY 4.0."
)
ATTRIBUTION = "Tafsir Center for Quranic Studies (مركز تفسير للدراسات القرآنيّة) — CC BY 4.0"


def resolve_db_path() -> Path:
    # ١) وسيط سطر الأوامر  ٢) متغيّر البيئة  ٣) مسار الكاش الافتراضيّ
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).expanduser()
    env = os.environ.get("TAFSIR_DB_PATH")
    if env:
        return Path(env).expanduser()
    return Path.home() / ".cache" / "tafsir-mcp" / "quran.db"


def main() -> int:
    # وضع جزئيّ (للاختبار/قواعد ناقصة): يتجاوز حُرّاس العدد الكامل
    allow_partial = os.environ.get("TAFSIR_ALLOW_PARTIAL") == "1"
    db_path = resolve_db_path()
    if not db_path.exists():
        sys.stderr.write(
            f"✗ لم يُعثر على قاعدة البيانات: {db_path}\n"
            "  مرّر المسار كوسيط، أو اضبط TAFSIR_DB_PATH، أو شغّل tafsir-mcp مرّة\n"
            "  ليُحمّل الكاش إلى ~/.cache/tafsir-mcp/quran.db\n"
        )
        return 1

    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row

    # فهرس السور: الاسم وعدد الآيات من جدول الإحصاءات (نفس مصدر خادم tafsir-mcp)
    surah_rows = conn.execute(
        "SELECT surahNo, surahName, ayahCount FROM surah_stats ORDER BY surahNo"
    ).fetchall()
    if len(surah_rows) != EXPECTED_SURAHS and not allow_partial:
        sys.stderr.write(
            f"✗ عدد السور غير متوقّع: {len(surah_rows)} (المتوقّع {EXPECTED_SURAHS})\n"
        )
        return 1

    surahs = []
    total_verses = 0
    for s in surah_rows:
        n = int(s["surahNo"])
        name = str(s["surahName"]).strip()
        ayah_count = int(s["ayahCount"])
        ayat = []
        for ayah_no in range(1, ayah_count + 1):
            words = conn.execute(
                "SELECT word FROM word_content_rasm"
                " WHERE surahNo = ? AND ayahNo = ? ORDER BY wordNo",
                (n, ayah_no),
            ).fetchall()
            # إعادة بناء الآية: وصل الكلمات بمسافة (مطابق لـ reconstruct_ayah)
            text = " ".join(str(w["word"]) for w in words).strip()
            if not text:
                sys.stderr.write(
                    f"✗ آية فارغة: سورة {n} آية {ayah_no} — قاعدة بيانات ناقصة؟\n"
                )
                return 1
            ayat.append(text)
        if len(ayat) != ayah_count:
            sys.stderr.write(
                f"✗ سورة {n}: عدد الآيات {len(ayat)} ≠ المعلن {ayah_count}\n"
            )
            return 1
        total_verses += len(ayat)
        surahs.append({"n": n, "name": name, "ayat": ayat})

    conn.close()

    if total_verses != EXPECTED_VERSES and not allow_partial:
        sys.stderr.write(
            f"✗ مجموع الآيات {total_verses} ≠ المتوقّع {EXPECTED_VERSES}\n"
        )
        return 1

    payload = {
        "_source": SOURCE_LABEL,
        "_attribution": ATTRIBUTION,
        "_note": "نصّ مرجعيّ لتصحيح الآيات. مُولَّد من قاعدة tafsir-mcp بنفس بنية "
        "surahs[].ayat[]. لا تُحرّر يدويّاً — أعِد توليده عبر "
        "scripts/build-quran-from-tafsir-db.py.",
        "_verses": total_verses,
        "_surahs": len(surahs),
        "surahs": surahs,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(
        f"✓ كُتب {OUT_PATH.relative_to(ROOT)} — "
        f"{len(surahs)} سورة، {total_verses} آية ({size_mb:.2f}MB)\n"
        f"  المصدر: {ATTRIBUTION}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
