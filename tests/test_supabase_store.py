import unittest

from lib.supabase_store import DEFAULT_BUCKET, current_config, supabase_is_configured


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


if __name__ == "__main__":
    unittest.main()
