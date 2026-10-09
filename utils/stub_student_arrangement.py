import csv
from pathlib import Path

DESKS = [f"{num}{alphabet}" for alphabet in "ABCDE" for num in range(1, 10)]
path = Path(__file__).resolve().parent.parent / "data" / "student_ids.csv"


with open(path, "r", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

for i, row in enumerate(rows):
    row["desk_id"] = DESKS[i // 2]

field_names = list(rows[0].keys())
written_path = (
    Path(__file__).resolve().parent.parent / "data" / "student_ids_with_desk_ids.csv"
)
with open(written_path, "w", encoding="utf-8") as f:
    w = csv.DictWriter(f, field_names)
    w.writeheader()
    w.writerows(rows)
