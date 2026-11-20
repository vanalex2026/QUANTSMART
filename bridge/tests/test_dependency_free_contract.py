"""Dependency-free bridge contract checks.

These checks deliberately inspect source files instead of importing the FastAPI
application. They keep the bridge lane useful on an offline or non-Windows
checkout where optional connector dependencies are unavailable.
"""
import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BRIDGE_SOURCE = (ROOT / "bridge" / "mt5_bridge.py").read_text(encoding="utf-8")
RECEIPT_SOURCE = (ROOT / "bridge" / "execution_receipts.py").read_text(encoding="utf-8")


class DependencyFreeBridgeContractTests(unittest.TestCase):
    def test_bridge_sources_are_valid_python_without_optional_imports(self):
        ast.parse(BRIDGE_SOURCE, filename="bridge/mt5_bridge.py")
        ast.parse(RECEIPT_SOURCE, filename="bridge/execution_receipts.py")

    def test_closed_bar_authority_markers_remain_explicit(self):
        self.assertIn('"authority": "SHADOW_ONLY"', BRIDGE_SOURCE)
        self.assertIn('"decision": "NO_DECISION"', BRIDGE_SOURCE)
        self.assertIn('"live_apply_allowed": False', BRIDGE_SOURCE)
        self.assertIn('HISTORY_CLOSED_BAR_PROVENANCE = "MT5_CLOSED_BARS"', BRIDGE_SOURCE)
        self.assertIn("CLOSED_BAR_TIMEFRAMES", BRIDGE_SOURCE)

    def test_receipt_contract_cannot_grant_live_authority(self):
        self.assertIn('AUTHORITY = "MANUAL_DEMO_ONLY"', RECEIPT_SOURCE)
        self.assertIn('receipt.get("real_execution_allowed") is not False', RECEIPT_SOURCE)
        self.assertIn('receipt.get("live_apply_allowed") is not False', RECEIPT_SOURCE)

    def test_fastapi_bound_modules_skip_when_optional_dependencies_are_missing(self):
        tests = ROOT / "bridge" / "tests"
        for name in (
            "test_mt5_bridge.py",
            "test_demo_execution.py",
            "test_broker_deals.py",
            "test_demo_automation.py",
        ):
            source = (tests / name).read_text(encoding="utf-8")
            self.assertIn("ModuleNotFoundError", source, name)
            self.assertIn("unittest.SkipTest", source, name)


if __name__ == "__main__":
    unittest.main()
