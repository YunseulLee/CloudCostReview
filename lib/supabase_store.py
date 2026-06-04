import json
import os
import tempfile
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from scripts.extract_cost_data import extract_workbook_payload
from scripts.review_server import safe_filename


DEFAULT_BUCKET = "cloud-cost-workbooks"


class SupabaseError(RuntimeError):
    pass


def supabase_is_configured(env=os.environ):
    return bool(env.get("SUPABASE_URL") and env.get("SUPABASE_SERVICE_ROLE_KEY"))


def key_type(key):
    value = str(key or "")
    if not value:
        return "missing"
    if value.startswith("sb_secret_"):
        return "sb-secret-key"
    if value.startswith("sb_publishable_"):
        return "sb-publishable-key"
    if value.startswith("eyJ"):
        return "legacy-jwt-key"
    return "unknown-key"


def normalize_supabase_url(url):
    normalized = (url or "").strip().rstrip("/")
    parsed = urlparse(normalized)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    for suffix in ("/rest/v1", "/storage/v1", "/auth/v1", "/functions/v1"):
        if normalized.endswith(suffix):
            return normalized[: -len(suffix)]
    return normalized


def current_config(env=os.environ):
    url = normalize_supabase_url(env.get("SUPABASE_URL"))
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    bucket = env.get("SUPABASE_STORAGE_BUCKET") or DEFAULT_BUCKET
    if not url or not key:
        raise SupabaseError("Supabase environment variables are not configured")
    return {"url": url, "key": key, "bucket": bucket}


def auth_headers(config, content_type="application/json"):
    headers = {
        "apikey": config["key"],
    }
    if not str(config["key"]).startswith("sb_"):
        headers["Authorization"] = f"Bearer {config['key']}"
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def request_json(method, path, body=None, query=None, prefer=None):
    config = current_config()
    url = f"{config['url']}/rest/v1/{path}"
    if query:
        url = f"{url}?{query}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = auth_headers(config)
    if prefer:
        headers["Prefer"] = prefer
    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read()
    except HTTPError as exc:
        raise SupabaseError(f"{method} /rest/v1/{path} failed: {read_http_error(exc)}") from exc
    if not raw:
        return None
    return json.loads(raw.decode("utf-8"))


def request_storage(method, object_path, body=None, content_type=None, upsert=False):
    config = current_config()
    encoded_path = "/".join(quote(part) for part in object_path.split("/"))
    url = f"{config['url']}/storage/v1/object/{quote(config['bucket'])}/{encoded_path}"
    headers = auth_headers(config, content_type)
    if upsert:
        headers["x-upsert"] = "true"
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=60) as response:
            return response.read()
    except HTTPError as exc:
        raise SupabaseError(
            f"{method} /storage/v1/object/{config['bucket']}/{object_path} "
            f"failed with {key_type(config['key'])}: {read_http_error(exc)}"
        ) from exc


def read_http_error(exc):
    try:
        details = exc.read().decode("utf-8")
    except Exception:
        details = str(exc)
    return details or str(exc)


def get_active_workbook():
    query = "is_active=eq.true&select=*&order=uploaded_at.desc&limit=1"
    rows = request_json("GET", "workbooks", query=query) or []
    return rows[0] if rows else None


def download_workbook_bytes(storage_path):
    return request_storage("GET", storage_path)


def upload_workbook(filename, workbook_bytes, uploader_name):
    safe_name = safe_filename(filename)
    storage_path = f"workbooks/{int(time.time())}-{safe_name}"
    request_storage(
        "POST",
        storage_path,
        body=workbook_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert=False,
    )

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as temp_file:
        temp_file.write(workbook_bytes)
        temp_path = Path(temp_file.name)
    try:
        payload = extract_workbook_payload(temp_path)
    finally:
        temp_path.unlink(missing_ok=True)

    payload["sourceWorkbook"] = storage_path
    inserted = request_json(
        "POST",
        "workbooks",
        {
            "filename": safe_name,
            "storage_path": storage_path,
            "sheet_name": payload["sheetName"],
            "payload": payload,
            "uploaded_by": uploader_name,
            "is_active": True,
        },
        prefer="return=representation",
    )
    workbook = inserted[0]
    request_json(
        "PATCH",
        "workbooks",
        {"is_active": False},
        query=f"is_active=eq.true&id=neq.{quote(str(workbook['id']), safe='')}",
    )
    payload["workbookId"] = workbook["id"]
    return {
        "ok": True,
        "filename": safe_name,
        "sheetName": payload["sheetName"],
        "rowCount": len(payload["rows"]),
        "monthCount": len(payload["monthColumns"]),
        "workbookId": workbook["id"],
    }


def get_current_payload():
    workbook = get_active_workbook()
    if not workbook:
        return None
    payload = workbook["payload"]
    payload["workbookId"] = workbook["id"]
    payload["sourceWorkbook"] = workbook["storage_path"]
    return payload


def get_review_state(workbook_id):
    encoded_id = quote(str(workbook_id), safe="")
    review_rows = request_json(
        "GET",
        "review_states",
        query=f"workbook_id=eq.{encoded_id}&select=row_id,verified,account_evidence_url",
    ) or []
    provider_rows = request_json(
        "GET",
        "provider_links",
        query=f"workbook_id=eq.{encoded_id}&select=provider,url",
    ) or []
    return {
        "overrides": {row["row_id"]: row["verified"] for row in review_rows},
        "links": {
            row["row_id"]: row["account_evidence_url"]
            for row in review_rows
            if row.get("account_evidence_url")
        },
        "providerLinks": {row["provider"]: row["url"] for row in provider_rows if row.get("url")},
    }


def save_review_state(workbook_id, rows, provider_links):
    review_rows = [
        {
            "workbook_id": workbook_id,
            "row_id": row.get("rowId"),
            "row_number": row.get("rowNumber"),
            "verified": bool(row.get("verified")),
        }
        for row in rows
        if row.get("rowId")
    ]
    if review_rows:
        request_json("POST", "review_states", review_rows, prefer="resolution=merge-duplicates,return=minimal")

    provider_links_dict = provider_links or {}
    to_upsert = [
        {"workbook_id": workbook_id, "provider": provider, "url": url}
        for provider, url in provider_links_dict.items()
        if provider and url
    ]
    to_delete = [p for p, url in provider_links_dict.items() if p and not url]
    if to_upsert:
        request_json("POST", "provider_links", to_upsert, prefer="resolution=merge-duplicates,return=minimal")
    if to_delete:
        encoded_id = quote(str(workbook_id), safe="")
        for provider in to_delete:
            request_json(
                "DELETE",
                "provider_links",
                query=f"workbook_id=eq.{encoded_id}&provider=eq.{quote(str(provider), safe='')}",
            )

    return {"ok": True}
