import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.ip_guard import check_request_ip
from lib.supabase_store import get_review_state, save_review_state, supabase_is_configured


EMPTY_STATE = {"overrides": {}, "links": {}, "providerLinks": {}, "memos": {}}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not check_request_ip(self):
            return
        workbook_id = self.query_param("workbookId")
        if not supabase_is_configured() or not workbook_id or workbook_id == "local":
            self.send_json(EMPTY_STATE)
            return
        self.send_json(get_review_state(workbook_id))

    def do_POST(self):
        if not check_request_ip(self):
            return
        payload = self.read_json()
        workbook_id = payload.get("workbookId")
        if workbook_id is None:
            self.send_json({"error": "workbookId is required"}, status=400)
            return
        if not supabase_is_configured() or not workbook_id or workbook_id == "local":
            self.send_json({"ok": True, "mode": "local"})
            return
        result = save_review_state(
            workbook_id,
            payload.get("rows", []),
            payload.get("providerLinks", {}),
        )
        self.send_json(result)

    def query_param(self, name):
        params = parse_qs(urlparse(self.path).query)
        return (params.get(name) or [""])[0]

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
