import unittest

from app.services.document_strategy import recommend_chunking_strategy
from app.services.text_chunker import chunk_csv_rows, chunk_text


class DocumentStrategyTests(unittest.TestCase):
    def test_csv_uses_row_chunking(self):
        strategy = recommend_chunking_strategy(".csv", "vendor_name,audit_frequency")

        self.assertEqual(strategy["chunking_method"], "csv_rows")
        self.assertFalse(strategy["ocr_required"])

    def test_short_pdf_requests_ocr(self):
        strategy = recommend_chunking_strategy(".pdf", "Too short")

        self.assertEqual(strategy["chunking_method"], "fixed")
        self.assertTrue(strategy["ocr_required"])


class TextChunkerTests(unittest.TestCase):
    def test_fixed_chunking_uses_overlap(self):
        chunks = chunk_text("abcdefghij", chunk_size=6, chunk_overlap=2)

        self.assertEqual(chunks, ["abcdef", "efghij"])

    def test_pipe_delimited_csv_rows_keep_each_record_together(self):
        chunks = chunk_csv_rows(
            "vendor | frequency\nBeta Ltd | quarterly\nAcme Corp | annual"
        )

        self.assertEqual(len(chunks), 2)
        self.assertIn("vendor: Beta Ltd", chunks[0])
        self.assertIn("frequency: quarterly", chunks[0])
