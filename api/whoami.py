import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.ip_guard import ALLOWED_IPS, get_client_ip


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        client_ip = get_client_ip(self)
        body = json.dumps({
            "detectedIp": client_ip,
            "allowed": client_ip in ALLOWED_IPS,
            "xVercelForwardedFor": self.headers.get("x-vercel-forwarded-for", ""),
            "xForwardedFor": self.headers.get("x-forwarded-for", ""),
        }, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
