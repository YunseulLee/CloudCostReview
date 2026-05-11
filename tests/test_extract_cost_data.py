import unittest

from scripts.extract_cost_data import DEFAULT_WORKBOOK_PATH, extract_workbook_payload


class ExtractCostDataTests(unittest.TestCase):
    def test_extract_workbook_payload_finds_usage_sheet_and_rows(self):
        payload = extract_workbook_payload(DEFAULT_WORKBOOK_PATH)

        self.assertTrue(payload["sheetName"].startswith("Usage "))
        self.assertEqual(payload["verifiedColumn"], "K")
        self.assertEqual(payload["currentCostColumn"], "W")
        self.assertEqual(len(payload["monthColumns"]), 12)
        self.assertGreater(len(payload["rows"]), 100)
        self.assertIn("provider", payload["rows"][0])


if __name__ == "__main__":
    unittest.main()
