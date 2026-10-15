"""学生番号→席の対応CSVから、HMAC化した照合表を worker/src/seat_map.json に書き出す。

実行例: uv run python utils/build_seat_map.py
（SEATMAP_SECRET 環境変数か worker/.dev.vars の値を使います）

shortcut: 実行時の秘密鍵と同じ鍵で作り直す必要がある。鍵を変えたら再生成して再デプロイすること。
"""

import csv
import hashlib
import hmac
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "data" / "student_ids_with_desk_ids.csv"
OUTPUT = ROOT / "worker" / "src" / "seat_map.json"


def load_secret() -> str:
    secret = os.environ.get("SEATMAP_SECRET", "").strip()
    if secret:
        return secret

    dev_vars = ROOT / "worker" / ".dev.vars"
    if dev_vars.exists():
        for line in dev_vars.read_text(encoding="utf-8").splitlines():
            name, separator, value = line.partition("=")
            if separator and name.strip() == "SEATMAP_SECRET" and value.strip():
                return value.strip()

    raise SystemExit("SEATMAP_SECRET を環境変数か worker/.dev.vars に設定してください")


def main() -> None:
    secret = load_secret().encode()
    with INPUT.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    table = {}
    for row in rows:
        student_id = row["student_ids"].strip()
        desk_id = row["desk_id"].strip()
        assert desk_id[:2] != "10", f"10列はTA席なので割り当てできません: {desk_id}"
        table[hmac.new(secret, student_id.encode(), hashlib.sha256).hexdigest()] = (
            desk_id
        )

    assert len(table) == len(rows), "学籍番号が重複しています"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(table, ensure_ascii=False, indent=0, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"{len(table)} 件を {OUTPUT} に書き出しました")


if __name__ == "__main__":
    main()
