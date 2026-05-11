import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripts.extract_cost_data import DEFAULT_WORKBOOK_PATH, extract_workbook_payload, resolve_sheet_path
from scripts.review_server import (
    ROOT_DIR,
    build_reviewed_workbook,
    process_uploaded_workbook,
    resolve_static_path,
    uploader_is_allowed,
)


class ReviewServerTests(unittest.TestCase):
    def test_process_uploaded_workbook_writes_current_data_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            workbook_bytes = DEFAULT_WORKBOOK_PATH.read_bytes()
            result = process_uploaded_workbook(
                workbook_bytes,
                "Cloud Cost of 2026-04.xlsx",
                uploader_name="이윤슬",
                uploads_dir=temp_path / "uploads",
                data_path=temp_path / "data" / "cost-accounts.json",
            )

            self.assertTrue(result["ok"])
            self.assertGreater(result["rowCount"], 100)
            saved_data = json.loads((temp_path / "data" / "cost-accounts.json").read_text())
            self.assertEqual(saved_data["sheetName"], result["sheetName"])
            self.assertEqual(len(saved_data["rows"]), result["rowCount"])

    def test_process_uploaded_workbook_rejects_unauthorized_uploader(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            workbook_bytes = DEFAULT_WORKBOOK_PATH.read_bytes()

            with self.assertRaises(PermissionError):
                process_uploaded_workbook(
                    workbook_bytes,
                    "Cloud Cost of 2026-04.xlsx",
                    uploader_name="Someone Else",
                    uploads_dir=temp_path / "uploads",
                    data_path=temp_path / "data" / "cost-accounts.json",
                )

    def test_uploader_is_allowed_accepts_configured_uploader_names(self):
        self.assertTrue(uploader_is_allowed("이윤슬"))
        self.assertTrue(uploader_is_allowed("이윤슬"))
        self.assertTrue(uploader_is_allowed(" Yunseul Lee "))
        self.assertTrue(uploader_is_allowed("Yunseul  Lee"))
        self.assertFalse(uploader_is_allowed("Jordan"))

    def test_build_reviewed_workbook_writes_web_checks_to_column_k(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            data_path = temp_path / "data" / "cost-accounts.json"
            result = process_uploaded_workbook(
                DEFAULT_WORKBOOK_PATH.read_bytes(),
                "Cloud Cost of 2026-04.xlsx",
                uploader_name="이윤슬",
                uploads_dir=temp_path / "uploads",
                data_path=data_path,
            )
            reviewed_bytes = build_reviewed_workbook(
                data_path,
                [
                    {"rowNumber": 4, "verified": True},
                    {"rowNumber": 5, "verified": False},
                ],
            )
            reviewed_path = temp_path / result["filename"]
            reviewed_path.write_bytes(reviewed_bytes)
            payload = extract_workbook_payload(reviewed_path, result["sheetName"])
            row_by_number = {row["rowNumber"]: row for row in payload["rows"]}

            self.assertEqual(row_by_number[4]["verified"], "v")
            self.assertEqual(row_by_number[5]["verified"], "")

    def test_build_reviewed_workbook_from_bytes_writes_web_checks_to_column_k(self):
        from scripts.review_server import build_reviewed_workbook_from_bytes

        payload = extract_workbook_payload(DEFAULT_WORKBOOK_PATH)
        reviewed_bytes = build_reviewed_workbook_from_bytes(
            DEFAULT_WORKBOOK_PATH.read_bytes(),
            payload["sheetName"],
            [
                {"rowNumber": 4, "verified": True},
                {"rowNumber": 5, "verified": False},
            ],
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            reviewed_path = Path(temp_dir) / "reviewed.xlsx"
            reviewed_path.write_bytes(reviewed_bytes)
            reviewed_payload = extract_workbook_payload(reviewed_path, payload["sheetName"])
            row_by_number = {row["rowNumber"]: row for row in reviewed_payload["rows"]}

        self.assertEqual(row_by_number[4]["verified"], "v")
        self.assertEqual(row_by_number[5]["verified"], "")

    def test_build_reviewed_workbook_preserves_first_sheet_xml_wrapper(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            data_path = temp_path / "data" / "cost-accounts.json"
            result = process_uploaded_workbook(
                DEFAULT_WORKBOOK_PATH.read_bytes(),
                "Cloud Cost of 2026-04.xlsx",
                uploader_name="이윤슬",
                uploads_dir=temp_path / "uploads",
                data_path=data_path,
            )
            source_workbook = Path(json.loads(data_path.read_text())["sourceWorkbook"])

            reviewed_bytes = build_reviewed_workbook(
                data_path,
                [
                    {"rowNumber": 4, "verified": True},
                    {"rowNumber": 5, "verified": False},
                ],
            )

            with zipfile.ZipFile(source_workbook) as source_archive:
                sheet_path = resolve_sheet_path(source_archive, result["sheetName"])
                original_xml = source_archive.read(sheet_path)
            reviewed_path = temp_path / "reviewed.xlsx"
            reviewed_path.write_bytes(reviewed_bytes)
            with zipfile.ZipFile(reviewed_path) as reviewed_archive:
                reviewed_xml = reviewed_archive.read(sheet_path)

            self.assertEqual(reviewed_xml[:512], original_xml[:512])

    def test_resolve_static_path_stays_inside_app_root(self):
        self.assertEqual(resolve_static_path("/"), ROOT_DIR / "index.html")
        self.assertIsNone(resolve_static_path("/../../../../../../etc/passwd"))


if __name__ == "__main__":
    unittest.main()
