import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


DEFAULT_WORKBOOK_PATH = Path(
    "/Users/ralrariralra/Library/CloudStorage/OneDrive-KRAFTON/itinfra - 3. 건별 구매,정산 (Cloud, , 21년2월~)/2026y/2026-05/Cloud Cost of 2026-04.xlsx"
)
DEFAULT_OUTPUT_PATH = Path("data/cost-accounts.json")
HEADER_ROW = 3
FIRST_DATA_ROW = 4
MONTH_COLUMNS = list(range(12, 24))

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def clean(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return value


def number_or_text(value):
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except ValueError:
        return clean(value)
    if number.is_integer():
        return int(number)
    return number


def column_number(cell_ref):
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    total = 0
    for letter in letters:
        total = total * 26 + (ord(letter) - ord("A") + 1)
    return total


def load_shared_strings(archive):
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values = []
    for item in root.findall("main:si", NS):
        texts = [node.text or "" for node in item.findall(".//main:t", NS)]
        values.append("".join(texts))
    return values


def workbook_sheets(archive):
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pkgrel:Relationship", NS)
    }

    sheets = []
    for sheet in workbook.findall(".//main:sheet", NS):
        rel_id = sheet.attrib[f"{{{NS['rel']}}}id"]
        target = rel_targets[rel_id]
        path = f"xl/{target}" if not target.startswith("/") else target.lstrip("/")
        sheets.append({"name": sheet.attrib.get("name", ""), "path": path})

    return sheets


def choose_usage_sheet(sheets, sheet_name=None):
    if sheet_name:
        for sheet in sheets:
            if sheet["name"] == sheet_name:
                return sheet
        raise ValueError(f"Sheet not found: {sheet_name}")

    for sheet in sheets:
        if sheet["name"].startswith("Usage "):
            return sheet

    raise ValueError("No sheet starting with 'Usage ' was found")


def resolve_sheet_path(archive, sheet_name):
    for sheet in workbook_sheets(archive):
        if sheet["name"] == sheet_name:
            return sheet["path"]

    raise ValueError(f"Sheet not found: {sheet_name}")
def cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", NS)

    if cell_type == "inlineStr":
        texts = [node.text or "" for node in cell.findall(".//main:t", NS)]
        return clean("".join(texts))

    if value_node is None:
        return ""

    raw = value_node.text or ""
    if cell_type == "s":
        index = int(raw)
        return clean(shared_strings[index] if index < len(shared_strings) else "")

    return number_or_text(raw)


def row_values(row, shared_strings):
    values = {}
    for cell in row.findall("main:c", NS):
        ref = cell.attrib.get("r", "")
        if not ref:
            continue
        values[column_number(ref)] = cell_value(cell, shared_strings)
    return values


def extract_workbook_payload(workbook_path, sheet_name=None):
    workbook_path = Path(workbook_path)
    with zipfile.ZipFile(workbook_path) as archive:
        shared_strings = load_shared_strings(archive)
        selected_sheet = choose_usage_sheet(workbook_sheets(archive), sheet_name)
        sheet_path = selected_sheet["path"]
        sheet_root = ET.fromstring(archive.read(sheet_path))

    parsed_rows = {}
    for row in sheet_root.findall(".//main:sheetData/main:row", NS):
        row_number = int(row.attrib["r"])
        parsed_rows[row_number] = row_values(row, shared_strings)

    headers = {
        column: clean(parsed_rows.get(HEADER_ROW, {}).get(column, ""))
        for column in range(1, 28)
    }

    rows = []
    for row_number in sorted(number for number in parsed_rows if number >= FIRST_DATA_ROW):
        values = parsed_rows[row_number]
        account = clean(values.get(8))
        provider = clean(values.get(1))
        if not account and not provider:
            continue

        months = [
            {
                "column": column,
                "header": headers[column],
                "value": values.get(column),
                "isCurrent": column == 23,
            }
            for column in MONTH_COLUMNS
        ]

        rows.append(
            {
                "id": f"row-{row_number}",
                "rowNumber": row_number,
                "provider": provider,
                "entity": clean(values.get(2)),
                "studio": clean(values.get(3)),
                "team": clean(values.get(4)),
                "project": clean(values.get(5)),
                "teamCode": clean(values.get(6)),
                "projectCode": clean(values.get(7)),
                "account": account,
                "owner": clean(values.get(9)),
                "costReviewer": clean(values.get(10)),
                "verified": clean(values.get(11)),
                "months": months,
                "currentCost": values.get(23),
                "diff": values.get(25),
                "diffRate": values.get(26),
                "entityCode": clean(values.get(27)),
                "evidenceUrl": "",
            }
        )

    payload = {
        "sourceWorkbook": str(workbook_path),
        "sheetName": selected_sheet["name"],
        "headerRow": HEADER_ROW,
        "verifiedColumn": "K",
        "currentCostColumn": "W",
        "monthColumns": [
            {"column": column, "header": headers[column], "isCurrent": column == 23}
            for column in MONTH_COLUMNS
        ],
        "rows": rows,
    }

    return payload


def write_payload(payload, output_path=DEFAULT_OUTPUT_PATH):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def main():
    workbook_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WORKBOOK_PATH
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT_PATH
    payload = extract_workbook_payload(workbook_path)
    write_payload(payload, output_path)
    print(f"Wrote {len(payload['rows'])} rows to {output_path}")


if __name__ == "__main__":
    main()
