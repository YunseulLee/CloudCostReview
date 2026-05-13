import os

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


def get_client_ip(handler):
    forwarded = handler.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return handler.client_address[0]


def check_request_ip(handler):
    client_ip = get_client_ip(handler)
    if client_ip not in ALLOWED_IPS:
        handler.send_error(403, f"Access denied: {client_ip} is not in the allowed IP list")
        return False
    return True
