import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.ip_guard import check_request_ip
from lib.supabase_store import get_current_payload, supabase_is_configured
from scripts.review_server import DATA_PATH


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not check_request_ip(self):
            return
        payload = None
        if supabase_is_configured():
            payload = get_current_payload()
        if payload is None:
            if DATA_PATH.exists():
                payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
                payload["workbookId"] = "local"
            else:
                payload = {"rows": [], "workbooks": [], "review_states": {}, "provider_links": {}, "workbookId": "local"}
        self.send_json(payload)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
