import unittest

from lib.supabase_store import (
    DEFAULT_BUCKET,
    auth_headers,
    current_config,
    key_type,
    normalize_supabase_url,
    supabase_is_configured,
)


class SupabaseStoreTests(unittest.TestCase):
    def test_supabase_is_configured_requires_url_and_service_role_key(self):
        self.assertFalse(supabase_is_configured({}))
        self.assertFalse(supabase_is_configured({"SUPABASE_URL": "https://example.supabase.co"}))
        self.assertTrue(
            supabase_is_configured(
                {
                    "SUPABASE_URL": "https://example.supabase.co",
                    "SUPABASE_SERVICE_ROLE_KEY": "secret",
                }
            )
        )

    def test_current_config_uses_default_bucket(self):
        config = current_config(
            {
                "SUPABASE_URL": "https://example.supabase.co/",
                "SUPABASE_SERVICE_ROLE_KEY": "secret",
            }
        )

        self.assertEqual(config["url"], "https://example.supabase.co")
        self.assertEqual(config["key"], "secret")
        self.assertEqual(config["bucket"], DEFAULT_BUCKET)

    def test_normalize_supabase_url_removes_api_paths(self):
        self.assertEqual(
            normalize_supabase_url("https://example.supabase.co/rest/v1"),
            "https://example.supabase.co",
        )
        self.assertEqual(
            normalize_supabase_url("https://example.supabase.co/storage/v1/"),
            "https://example.supabase.co",
        )
        self.assertEqual(
            normalize_supabase_url("https://example.supabase.co/rest/v1?select=*"),
            "https://example.supabase.co",
        )
        self.assertEqual(
            normalize_supabase_url("https://example.supabase.co/project/default/api"),
            "https://example.supabase.co",
        )

    def test_auth_headers_omit_authorization_for_new_secret_keys(self):
        headers = auth_headers({"key": "sb_secret_abc"})

        self.assertEqual(headers["apikey"], "sb_secret_abc")
        self.assertNotIn("Authorization", headers)

    def test_auth_headers_keep_authorization_for_legacy_jwt_keys(self):
        headers = auth_headers({"key": "eyJhbGciOiJIUzI1NiJ9.payload.signature"})

        self.assertEqual(headers["apikey"], "eyJhbGciOiJIUzI1NiJ9.payload.signature")
        self.assertEqual(
            headers["Authorization"],
            "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
        )

    def test_key_type_labels_secret_and_legacy_keys_without_exposing_values(self):
        self.assertEqual(key_type("sb_secret_abc"), "sb-secret-key")
        self.assertEqual(key_type("eyJhbGciOiJIUzI1NiJ9.payload.signature"), "legacy-jwt-key")
        self.assertEqual(key_type(""), "missing")


if __name__ == "__main__":
    unittest.main()
