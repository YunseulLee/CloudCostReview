import cgi
import io
import json
import mimetypes
import os
import re
import sys
import unicodedata
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.extract_cost_data import extract_workbook_payload, resolve_sheet_path, write_payload

UPLOADS_DIR = ROOT_DIR / "uploads"
DATA_PATH = ROOT_DIR / "data" / "cost-accounts.json"
_env_uploaders = os.environ.get("ALLOWED_UPLOADERS", "")
ALLOWED_UPLOADERS = {n.strip().lower() for n in _env_uploaders.split(",") if n.strip()} or {"이윤슬", "yunseul", "yunseul lee"}
VERIFIED_COLUMN = "K"

_DEFAULT_ALLOWED_IPS = {
    "<redacted>", "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>7",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>", "<redacted>",
    "<redacted>", "<redacted>", "<redacted>",
}
_env_ips = os.environ.get("ALLOWED_IPS", "")
_extra_ips = {ip.strip() for ip in _env_ips.split(",") if ip.strip()}
ALLOWED_IPS = _DEFAULT_ALLOWED_IPS | _extra_ips


def ip_is_allowed(ip):
    if not ALLOWED_IPS:
        return True
    return ip in ALLOWED_IPS


def normalize_uploader_name(name):
    normalized = unicodedata.normalize("NFC", str(name or "")).strip().lower()
    return re.sub(r"\s+", " ", normalized)


def uploader_is_allowed(name):
    return normalize_uploader_name(name) in ALLOWED_UPLOADERS


def safe_filename(filename):
    name = Path(filename or "uploaded.xlsx").name
    name = re.sub(r"[^0-9A-Za-z가-힣._ -]+", "_", name).strip()
    return name or "uploaded.xlsx"


def process_uploaded_workbook(
    workbook_bytes,
    filename,
    uploader_name,
    uploads_dir=UPLOADS_DIR,
    data_path=DATA_PATH,
):
    if not uploader_is_allowed(uploader_name):
        raise PermissionError("This uploader is not allowed to upload monthly Excel files")

    uploads_dir = Path(uploads_dir)
    data_path = Path(data_path)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    saved_path = uploads_dir / safe_filename(filename)
    saved_path.write_bytes(workbook_bytes)

    payload = extract_workbook_payload(saved_path)
    write_payload(payload, data_path)

    return {
        "ok": True,
        "filename": saved_path.name,
        "sheetName": payload["sheetName"],
        "rowCount": len(payload["rows"]),
        "monthCount": len(payload["monthColumns"]),
    }


def column_sort_key(column):
    total = 0
    for letter in column.upper():
        total = total * 26 + (ord(letter) - ord("A") + 1)
    return total


def cell_pattern(cell_ref):
    return re.compile(
        rf'<c\b(?=[^>]*\br="{re.escape(cell_ref)}")(?:"[^"]*"|[^>])*?(?:/>|>.*?</c>)',
        re.DOTALL,
    )


def row_pattern(row_number):
    return re.compile(
        rf'(<row\b(?=[^>]*\br="{row_number}")(?:"[^"]*"|[^>])*>)(.*?)(</row>)',
        re.DOTALL,
    )


def get_cell_ref(cell_markup):
    match = re.search(r'\br="([A-Z]+)(\d+)"', cell_markup)
    if not match:
        return "", 0
    return match.group(1), int(match.group(2))


def get_style_attribute(cell_markup):
    match = re.search(r'\bs="([^"]*)"', cell_markup or "")
    return f' s="{match.group(1)}"' if match else ""


def build_verified_cell(cell_ref, verified, existing_cell=""):
    style = get_style_attribute(existing_cell)
    if verified:
        return f'<c r="{cell_ref}"{style} t="inlineStr"><is><t>v</t></is></c>'
    if not existing_cell:
        return ""
    return f'<c r="{cell_ref}"{style}/>'


def insert_cell_in_row(row_body, cell_markup):
    target_column, _ = get_cell_ref(cell_markup)
    target_sort_key = column_sort_key(target_column)
    any_cell_pattern = re.compile(r'<c\b(?:"[^"]*"|[^>])*?(?:/>|>.*?</c>)', re.DOTALL)

    for match in any_cell_pattern.finditer(row_body):
        column, _ = get_cell_ref(match.group(0))
        if column and column_sort_key(column) > target_sort_key:
            return row_body[: match.start()] + cell_markup + row_body[match.start() :]
    return row_body + cell_markup


def update_row_cell(sheet_xml, row_number, cell_ref, verified):
    match = row_pattern(row_number).search(sheet_xml)
    if match:
        row_body = match.group(2)
        existing_match = cell_pattern(cell_ref).search(row_body)
        existing_cell = existing_match.group(0) if existing_match else ""
        new_cell = build_verified_cell(cell_ref, verified, existing_cell)
        if existing_match:
            new_body = row_body[: existing_match.start()] + new_cell + row_body[existing_match.end() :]
        elif new_cell:
            new_body = insert_cell_in_row(row_body, new_cell)
        else:
            new_body = row_body
        return sheet_xml[: match.start(2)] + new_body + sheet_xml[match.end(2) :]

    if not verified:
        return sheet_xml

    new_row = f'<row r="{row_number}">{build_verified_cell(cell_ref, True)}</row>'
    sheet_data_match = re.search(r'(<sheetData>)(.*?)(</sheetData>)', sheet_xml, re.DOTALL)
    if sheet_data_match is None:
        raise ValueError("Workbook sheetData was not found")

    sheet_body = sheet_data_match.group(2)
    for existing_row in re.finditer(r'<row\b(?=[^>]*\br="(\d+)")(?:"[^"]*"|[^>])*?(?:/>|>.*?</row>)', sheet_body, re.DOTALL):
        existing_number = int(existing_row.group(1))
        if existing_number > row_number:
            new_body = sheet_body[: existing_row.start()] + new_row + sheet_body[existing_row.start() :]
            return sheet_xml[: sheet_data_match.start(2)] + new_body + sheet_xml[sheet_data_match.end(2) :]

    new_body = sheet_body + new_row
    return sheet_xml[: sheet_data_match.start(2)] + new_body + sheet_xml[sheet_data_match.end(2) :]


def update_verified_cells(sheet_xml, review_rows):
    text = sheet_xml.decode("utf-8") if isinstance(sheet_xml, bytes) else sheet_xml
    if "<sheetData" not in text:
        raise ValueError("Workbook sheetData was not found")

    for item in review_rows:
        try:
            row_number = int(item.get("rowNumber"))
        except (TypeError, ValueError):
            continue
        cell_ref = f"{VERIFIED_COLUMN}{row_number}"
        text = update_row_cell(text, row_number, cell_ref, item.get("verified") is True)

    return text.encode("utf-8")


def build_reviewed_workbook(data_path, review_rows):
    payload = json.loads(Path(data_path).read_text(encoding="utf-8"))
    source_workbook = Path(payload["sourceWorkbook"])
    if not source_workbook.exists():
        raise FileNotFoundError(f"Source workbook not found: {source_workbook}")

    return build_reviewed_workbook_from_bytes(source_workbook.read_bytes(), payload["sheetName"], review_rows)


def build_reviewed_workbook_from_bytes(workbook_bytes, sheet_name, review_rows):
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(workbook_bytes)) as source_archive:
        sheet_path = resolve_sheet_path(source_archive, sheet_name)
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as target_archive:
            for item in source_archive.infolist():
                data = source_archive.read(item.filename)
                if item.filename == sheet_path:
                    data = update_verified_cells(data, review_rows)
                target_archive.writestr(item, data)

    return output.getvalue()


class ReviewRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def check_ip(self):
        client_ip = self.client_address[0]
        if not ip_is_allowed(client_ip):
            self.send_error(403, f"Access denied: {client_ip} is not in the allowed IP list")
            return False
        return True

    def do_GET(self):
        if not self.check_ip():
            return
        if self.path.startswith("/api/current"):
            payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            payload["workbookId"] = "local"
            self.send_json(payload)
            return
        if self.path.startswith("/api/review-state"):
            self.send_json({"overrides": {}, "links": {}, "providerLinks": {}, "memos": {}})
            return
        super().do_GET()

    def do_POST(self):
        if not self.check_ip():
            return
        if self.path == "/api/upload":
            self.handle_upload()
            return
        if self.path == "/api/export-reviewed":
            self.handle_export_reviewed()
            return
        if self.path == "/api/review-state":
            self.send_json({"ok": True, "mode": "local"})
            return
        self.send_error(404, "Not found")

    def handle_upload(self):
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            self.send_error(400, "multipart/form-data is required")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
            },
        )
        file_item = form["workbook"] if "workbook" in form else None
        uploader_item = form["uploader"] if "uploader" in form else None
        if file_item is None or not getattr(file_item, "filename", ""):
            self.send_error(400, "workbook file is required")
            return
        uploader_name = uploader_item.value if uploader_item is not None else ""

        workbook_bytes = file_item.file.read()
        try:
            result = process_uploaded_workbook(
                workbook_bytes,
                file_item.filename,
                uploader_name,
            )
        except PermissionError as exc:
            self.send_error(403, str(exc))
            return
        except Exception as exc:
            self.send_error(400, f"Workbook upload failed: {exc}")
            return

        self.send_json(result)

    def handle_export_reviewed(self):
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("application/json"):
            self.send_error(400, "application/json is required")
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        if not uploader_is_allowed(payload.get("uploader")):
            self.send_error(403, "This uploader is not allowed to export reviewed Excel files")
            return

        try:
            body = build_reviewed_workbook(DATA_PATH, payload.get("rows", []))
        except Exception as exc:
            self.send_error(400, f"Reviewed workbook export failed: {exc}")
            return

        data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        filename = f"{safe_filename(Path(data.get('sourceWorkbook', 'cloud-cost.xlsx')).stem)}_reviewed.xlsx"
        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def translate_path(self, path):
        resolved = resolve_static_path(path)
        if resolved is None:
            return str(ROOT_DIR / ".not-found")
        return str(resolved)


def resolve_static_path(path):
    path = unquote(path.split("?", 1)[0].split("#", 1)[0])
    if path == "/":
        path = "/index.html"
    candidate = (ROOT_DIR / path.lstrip("/")).resolve()
    try:
        candidate.relative_to(ROOT_DIR)
    except ValueError:
        return None
    return candidate


def run(host="0.0.0.0", port=61888):
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer((host, port), ReviewRequestHandler)
    if ALLOWED_IPS:
        print(f"Allowed IPs: {', '.join(sorted(ALLOWED_IPS))}")
    else:
        print("Allowed IPs: all (set ALLOWED_IPS env var to restrict)")
    print(f"Cloud Cost Review server running at http://{host}:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    run()
