"""Write the HMAC lookup table to worker/src/seat_map.json from the student ID to desk CSV.

Usage: uv run python utils/build_seat_map.py
(Reads the SEATMAP_SECRET environment variable, or the value in worker/.dev.vars.)

shortcut: rebuild with the same secret the Worker runs with. Regenerate and redeploy when it changes.
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
    seats: dict[str, list[dict]] = {}
    for row in rows:
        desk_id = row["desk_id"].strip()
        assert desk_id[:2] != "10", f"10列はTA席なので割り当てできません: {desk_id}"
        seats.setdefault(desk_id, []).append(row)

    for desk_id, group in seats.items():
        for index, row in enumerate(group):
            # The first row of a desk is the left seat, the second is the right
            assert index < 2, f"1つの机に3人以上います: {desk_id}"
            student_id = row["student_ids"].strip()
            table[hmac.new(secret, student_id.encode(), hashlib.sha256).hexdigest()] = (
                f"{desk_id}:{'lr'[index]}"
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
