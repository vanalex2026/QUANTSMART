import unittest

from bridge.execution_receipts import (
    normalize_receipt,
    receipt_resolution,
    unavailable_receipt,
)


SCOPE = {
    "scope": "MANUAL_DEMO_ONLY",
    "real_execution_allowed": False,
    "live_apply_allowed": False,
}


class ExecutionReceiptTests(unittest.TestCase):
    def test_resolution_taxonomy_is_explicit(self):
        self.assertEqual(
            normalize_receipt({"ok": True, "state": "preview", **SCOPE})[
                "execution_resolution"
            ],
            "PENDING",
        )
        self.assertEqual(
            unavailable_receipt()["execution_resolution"], "UNAVAILABLE"
        )

    def test_unknown_requires_an_allowlisted_unavailable_reason(self):
        self.assertEqual(
            unavailable_receipt("BROKER_RESULT_UNKNOWN_CHECK_MT5")["reason"],
            "BROKER_RESULT_UNKNOWN_CHECK_MT5",
        )
        with self.assertRaisesRegex(ValueError, "UNKNOWN_RECEIPT_REASON"):
            normalize_receipt(
                {"ok": False, "state": "unknown", "reason": "FILLED", **SCOPE}
            )

    def test_unknown_must_be_explicitly_unsuccessful(self):
        with self.assertRaisesRegex(ValueError, "UNKNOWN_RECEIPT_REASON"):
            normalize_receipt(
                {
                    "ok": True,
                    "state": "unknown",
                    "reason": "BROKER_RESULT_UNKNOWN_CHECK_MT5",
                    **SCOPE,
                }
            )

    def test_malformed_fill_cannot_be_normalized(self):
        with self.assertRaisesRegex(ValueError, "INVALID_FILLED_RECEIPT"):
            normalize_receipt(
                {
                    "ok": True,
                    "state": "filled",
                    "order": "900",
                    "deal": "901",
                    "volume": 0,
                    "price": float("nan"),
                    **SCOPE,
                }
            )

    def test_fill_requires_positive_numeric_broker_ids(self):
        for field in ("order", "deal"):
            payload = {
                "ok": True,
                "state": "filled",
                "order": "900",
                "deal": "901",
                "volume": 0.1,
                "price": 100.0,
                **SCOPE,
            }
            payload[field] = "0"
            with self.assertRaisesRegex(ValueError, "INVALID_FILLED_RECEIPT"):
                normalize_receipt(payload)

    def test_authority_is_required(self):
        with self.assertRaisesRegex(ValueError, "INVALID_RECEIPT_AUTHORITY"):
            normalize_receipt({"ok": True, "state": "preview"})

    def test_resolution_rejects_unknown_state(self):
        with self.assertRaisesRegex(ValueError, "INVALID_RECEIPT_STATE"):
            receipt_resolution({"state": "filled-ish"})


if __name__ == "__main__":
    unittest.main()
