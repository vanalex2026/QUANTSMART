import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from bridge.closed_candle_store import ClosedCandleStore


def batch(symbol="XAUUSD", source="MT5_CLOSED_BARS", bars=None):
    return {
        "symbol": symbol,
        "broker_symbol": "GOLDmicro",
        "timeframe": "M5",
        "source": source,
        "closed_bar_provenance": "MT5_CLOSED_BARS",
        "forming_bar_included": False,
        "server_timezone": "UTC",
        "timestamp_basis": "UTC",
        "authority": "SHADOW_ONLY",
        "decision": "NO_DECISION",
        "live_apply_allowed": False,
        "read_only": True,
        "bars": bars if bars is not None else [
            {"i": 0, "t": "2026-01-01T00:00:00Z", "o": 10, "h": 12, "l": 9, "c": 11, "tick_volume": 4, "spread": 2},
            {"i": 1, "t": "2026-01-01T00:05:00Z", "o": 11, "h": 13, "l": 10, "c": 12, "tick_volume": 5, "spread": 2},
        ],
    }


class ClosedCandleStoreTests(unittest.TestCase):
    def test_env_path_is_used_and_database_is_created_on_first_write(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "nested" / "bars.sqlite3"
            with patch.dict(os.environ, {"MFE_CLOSED_CANDLES_DB": f"  {path}  "}, clear=False):
                store = ClosedCandleStore()
                self.assertEqual(store.path, path)
                self.assertFalse(path.exists(), "constructing the store must not create market-data state")
                self.assertEqual(store.upsert("1", "srv", batch()), 2)
                self.assertTrue(path.exists())

    def test_restart_and_dedup(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bars.sqlite3"
            self.assertEqual(ClosedCandleStore(path).upsert("1", "srv", batch()), 2)
            self.assertEqual(ClosedCandleStore(path).upsert("1", "srv", batch()), 2)
            self.assertEqual(len(ClosedCandleStore(path).recent("1", "srv", "GOLDmicro", "UTC")), 2)

    def test_recent_rebases_indices_for_a_standalone_tail(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bars.sqlite3"
            rows = [dict(bar, i=100 + index) for index, bar in enumerate(batch()["bars"])]
            store = ClosedCandleStore(path)
            store.upsert("1", "srv", batch(bars=rows))
            tail = store.recent("1", "srv", "GOLDmicro", "UTC")
            self.assertEqual([bar["i"] for bar in tail], [0, 1])

    def test_range_history_source_is_accepted_when_provenance_is_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ClosedCandleStore(Path(folder) / "bars.sqlite3")
            self.assertEqual(store.upsert("1", "srv", batch(source="MT5_HISTORY")), 2)

    def test_bad_batch_is_atomic(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ClosedCandleStore(Path(folder) / "bars.sqlite3")
            invalid = batch(bars=[batch()["bars"][0], {"t": "2026-01-01T00:05:00Z", "o": 1, "h": 0, "l": 1, "c": 1, "tick_volume": 1, "spread": 1}])
            with self.assertRaises(ValueError):
                store.upsert("1", "srv", invalid)
            self.assertEqual(store.recent("1", "srv", "GOLDmicro", "UTC"), [])

    def test_scope_isolation_and_bounded_read(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ClosedCandleStore(Path(folder) / "bars.sqlite3")
            store.upsert("1", "srv", batch())
            store.upsert("2", "srv", batch())
            self.assertEqual(len(store.recent("1", "srv", "GOLDmicro", "UTC")), 2)
            self.assertEqual(store.recent("1", "srv", "OTHER", "UTC"), [])
            with self.assertRaises(ValueError):
                store.recent("1", "srv", "GOLDmicro", "UTC", 5001)


if __name__ == "__main__":
    unittest.main()
