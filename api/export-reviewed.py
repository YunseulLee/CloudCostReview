import json
import re
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.ip_guard import check_request_ip
from lib.supabase_store import download_workbook_bytes, get_active_workbook, supabase_is_configured
from scripts.review_server import (
    DATA_PATH,
    build_reviewed_workbook,
    build_reviewed_workbook_from_bytes,
    safe_filename,
    uploader_is_allowed,
)


def reviewed_filename(original_stem, count):
    base = re.sub(r'_reviewed.*$', '', original_stem, flags=re.IGNORECASE)
    # 누적된 (N) 또는 safe_filename이 변환한 _N_ 패턴을 모두 제거
    base = re.sub(r'(\(\d+\)|_\d+_)+$', '', base).rstrip('_ ')
    return f"{base}({count}).xlsx"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not check_request_ip(self):
            return
        payload = self.read_json()
        if not uploader_is_allowed(payload.get("uploader")):
            self.send_error(403, "This uploader is not allowed to export reviewed Excel files")
            return

        count = max(1, int(payload.get("count") or 1))
        try:
            if supabase_is_configured():
                workbook = get_active_workbook()
                if not workbook:
                    raise ValueError("No active workbook has been uploaded")
                original_bytes = download_workbook_bytes(workbook["storage_path"])
                body = build_reviewed_workbook_from_bytes(
                    original_bytes,
                    workbook["sheet_name"],
                    payload.get("rows", []),
                )
                filename = reviewed_filename(Path(workbook['filename']).stem, count)
            else:
                body = build_reviewed_workbook(DATA_PATH, payload.get("rows", []))
                data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
                filename = reviewed_filename(Path(data.get('sourceWorkbook', 'cloud-cost.xlsx')).stem, count)
        except Exception as exc:
            print(f"export-reviewed error: {exc}", file=sys.stderr)
            self.send_error(400, "Reviewed workbook export failed")
            return

        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))
