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


def ip_is_allowed(ip):
    return ip in ALLOWED_IPS


def get_client_ip(handler):
    # x-vercel-forwarded-for is injected by Vercel's edge and cannot be spoofed by clients
    vercel_ip = handler.headers.get("x-vercel-forwarded-for", "").strip()
    if vercel_ip:
        return vercel_ip.split(",")[0].strip()
    # Rightmost entry of x-forwarded-for is added by the nearest trusted proxy
    forwarded = handler.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return handler.client_address[0]


def check_request_ip(handler):
    client_ip = get_client_ip(handler)
    if not ip_is_allowed(client_ip):
        handler.send_error(403, f"Access denied: {client_ip} is not in the allowed IP list")
        return False
    return True
