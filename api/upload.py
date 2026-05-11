import cgi
import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.supabase_store import supabase_is_configured, upload_workbook
from scripts.review_server import process_uploaded_workbook, uploader_is_allowed


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            self.send_error(400, "multipart/form-data is required")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": content_type},
        )
        file_item = form["workbook"] if "workbook" in form else None
        uploader_item = form["uploader"] if "uploader" in form else None
        uploader_name = uploader_item.value if uploader_item is not None else ""
        if not uploader_is_allowed(uploader_name):
            self.send_error(403, "This uploader is not allowed to upload monthly Excel files")
            return
        if file_item is None or not getattr(file_item, "filename", ""):
            self.send_error(400, "workbook file is required")
            return

        workbook_bytes = file_item.file.read()
        try:
            if supabase_is_configured():
                result = upload_workbook(file_item.filename, workbook_bytes, uploader_name)
            else:
                result = process_uploaded_workbook(workbook_bytes, file_item.filename, uploader_name)
        except Exception as exc:
            self.send_error(400, f"Workbook upload failed: {exc}")
            return

        self.send_json(result)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
