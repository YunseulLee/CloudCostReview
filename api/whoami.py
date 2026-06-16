import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.ip_guard import get_client_ip


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        ip = get_client_ip(self)
        headers_dump = {
            "x-vercel-forwarded-for": self.headers.get("x-vercel-forwarded-for", ""),
            "x-forwarded-for": self.headers.get("x-forwarded-for", ""),
            "x-real-ip": self.headers.get("x-real-ip", ""),
        }
        import json
        body = json.dumps({"ip": ip, "headers": headers_dump}, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
