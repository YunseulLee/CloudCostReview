import json
import os
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


DEFAULT_WORKBOOK_PATH = Path(os.environ["WORKBOOK_PATH"]) if os.environ.get("WORKBOOK_PATH") else None
DEFAULT_OUTPUT_PATH = Path("data/cost-accounts.json")
HEADER_ROW = 3
FIRST_DATA_ROW = 4
MONTH_COLUMNS = list(range(12, 24))

COL_PROVIDER = 1
COL_ENTITY = 2
COL_STUDIO = 3
COL_TEAM = 4
COL_PROJECT = 5
COL_TEAM_CODE = 6
COL_PROJECT_CODE = 7
COL_ACCOUNT = 8
COL_OWNER = 9
COL_COST_REVIEWER = 10
COL_VERIFIED = 11
COL_CURRENT_COST = 23
COL_DIFF = 25
COL_DIFF_RATE = 26
COL_ENTITY_CODE = 27

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
        account = clean(values.get(COL_ACCOUNT))
        provider = clean(values.get(COL_PROVIDER))
        if not account and not provider:
            continue

        months = [
            {
                "column": column,
                "header": headers[column],
                "value": values.get(column),
                "isCurrent": column == MONTH_COLUMNS[-1],
            }
            for column in MONTH_COLUMNS
        ]

        rows.append(
            {
                "id": f"row-{row_number}",
                "rowNumber": row_number,
                "provider": provider,
                "entity": clean(values.get(COL_ENTITY)),
                "studio": clean(values.get(COL_STUDIO)),
                "team": clean(values.get(COL_TEAM)),
                "project": clean(values.get(COL_PROJECT)),
                "teamCode": clean(values.get(COL_TEAM_CODE)),
                "projectCode": clean(values.get(COL_PROJECT_CODE)),
                "account": account,
                "owner": clean(values.get(COL_OWNER)),
                "costReviewer": clean(values.get(COL_COST_REVIEWER)),
                "verified": clean(values.get(COL_VERIFIED)),
                "months": months,
                "currentCost": values.get(COL_CURRENT_COST),
                "diff": values.get(COL_DIFF),
                "diffRate": values.get(COL_DIFF_RATE),
                "entityCode": clean(values.get(COL_ENTITY_CODE)),
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
            {"column": column, "header": headers[column], "isCurrent": column == MONTH_COLUMNS[-1]}
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
    if workbook_path is None:
        print("Error: WORKBOOK_PATH environment variable is not set. Pass the file path as an argument or set WORKBOOK_PATH.", file=sys.stderr)
        sys.exit(1)
    workbook_path = Path(workbook_path)
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT_PATH
    payload = extract_workbook_payload(workbook_path)
    write_payload(payload, output_path)
    print(f"Wrote {len(payload['rows'])} rows to {output_path}")


if __name__ == "__main__":
    main()
