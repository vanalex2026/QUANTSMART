"""Durable, scoped storage for validated MT5 closed XAUUSD M5 candles.

This module deliberately has no dependency on the bridge service.  It accepts
the bridge's closed-history response shape and keeps account/server/symbol/
timezone namespaces separate across process restarts.
"""
from __future__ import annotations

import math
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


_MAX_READ = 5_000
_DEFAULT_LIMIT = 500
_DATABASE_ENV = "MFE_CLOSED_CANDLES_DB"


def _default_path() -> Path:
    return Path(__file__).resolve().parents[1] / ".mfe-state" / "closed-candles.sqlite3"


def _utc_stamp(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("CANDLE_TIMESTAMP_INVALID")
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise ValueError("CANDLE_TIMESTAMP_INVALID") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None or parsed.utcoffset().total_seconds() != 0:
        raise ValueError("CANDLE_TIMESTAMP_MUST_BE_UTC")
    instant = parsed.astimezone(timezone.utc)
    if instant.second or instant.microsecond or instant.minute % 5:
        raise ValueError("CANDLE_TIMESTAMP_NOT_ALIGNED")
    if instant.timestamp() + 300 > datetime.now(timezone.utc).timestamp() + 1:
        raise ValueError("CANDLE_TIMESTAMP_NOT_CLOSED")
    return instant.isoformat(timespec="seconds").replace("+00:00", "Z")


def _number(value: Any) -> float:
    if isinstance(value, bool):
        raise ValueError("CANDLE_PRICE_INVALID")
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("CANDLE_PRICE_INVALID") from exc
    if not math.isfinite(result):
        raise ValueError("CANDLE_PRICE_INVALID")
    return result


def _nonnegative_int(value: Any, reason: str) -> int:
    if isinstance(value, bool):
        raise ValueError(reason)
    try:
        result = int(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(reason) from exc
    if result < 0 or result != value:
        raise ValueError(reason)
    return result


class ClosedCandleStore:
    """SQLite-backed closed-bar store with atomic validated batch writes."""

    def __init__(self, path: str | os.PathLike[str] | None = None):
        configured = path if path is not None else os.environ.get(_DATABASE_ENV)
        if isinstance(configured, str):
            configured = configured.strip()
        self.path = Path(configured).expanduser() if configured else _default_path()
        self.db_path = self.path

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=10000")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS closed_candles (
                account_id TEXT NOT NULL,
                server TEXT NOT NULL,
                broker_symbol TEXT NOT NULL,
                server_timezone TEXT NOT NULL,
                candle_time TEXT NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                tick_volume INTEGER NOT NULL,
                spread INTEGER NOT NULL,
                row_index INTEGER NOT NULL,
                PRIMARY KEY (account_id, server, broker_symbol,
                             server_timezone, candle_time)
            )"""
        )
        connection.commit()
        return connection

    @staticmethod
    def _validate_batch(account_id: Any, server: Any, payload: Any) -> tuple[str, str, str, str, list[dict[str, Any]]]:
        if account_id is None or server is None:
            raise ValueError("CANDLE_SCOPE_INVALID")
        account = str(account_id).strip()
        server_name = str(server).strip()
        if not account or not server_name or len(account) > 128 or len(server_name) > 256:
            raise ValueError("CANDLE_SCOPE_INVALID")
        if not isinstance(payload, dict):
            raise ValueError("CANDLE_BATCH_INVALID")
        if str(payload.get("symbol", "")).upper() != "XAUUSD":
            raise ValueError("CANDLE_SYMBOL_INVALID")
        if str(payload.get("timeframe", "")).upper() != "M5":
            raise ValueError("CANDLE_TIMEFRAME_INVALID")
        if payload.get("source") not in {"MT5_HISTORY", "MT5_CLOSED_BARS"} or payload.get("closed_bar_provenance") != "MT5_CLOSED_BARS":
            raise ValueError("CANDLE_PROVENANCE_INVALID")
        if (payload.get("forming_bar_included") is not False
                or payload.get("timestamp_basis") != "UTC"
                or payload.get("authority") != "SHADOW_ONLY"
                or payload.get("decision") != "NO_DECISION"
                or payload.get("live_apply_allowed") is not False
                or payload.get("read_only") is not True):
            raise ValueError("CANDLE_CLOSED_CONTRACT_INVALID")
        broker_symbol = str(payload.get("broker_symbol", "")).strip()
        server_timezone = str(payload.get("server_timezone", "")).strip()
        if not broker_symbol or not server_timezone or len(broker_symbol) > 128 or len(server_timezone) > 128:
            raise ValueError("CANDLE_SCOPE_INVALID")
        raw_bars = payload.get("bars")
        if not isinstance(raw_bars, list):
            raise ValueError("CANDLE_BATCH_INVALID")
        bars: list[dict[str, Any]] = []
        seen: set[str] = set()
        for position, raw in enumerate(raw_bars):
            if not isinstance(raw, dict):
                raise ValueError("CANDLE_ROW_INVALID")
            stamp = _utc_stamp(raw.get("t"))
            if stamp in seen:
                raise ValueError("CANDLE_DUPLICATE_TIMESTAMP")
            seen.add(stamp)
            open_, high, low, close = (_number(raw.get(key)) for key in ("o", "h", "l", "c"))
            if high < max(open_, low, close) or low > min(open_, high, close):
                raise ValueError("CANDLE_OHLC_INVALID")
            ticks = _nonnegative_int(raw.get("tick_volume"), "CANDLE_VOLUME_INVALID")
            spread = _nonnegative_int(raw.get("spread"), "CANDLE_SPREAD_INVALID")
            index = _nonnegative_int(raw.get("i", position), "CANDLE_INDEX_INVALID")
            bars.append({"t": stamp, "o": open_, "h": high, "l": low, "c": close,
                         "tick_volume": ticks, "spread": spread, "i": index})
        return account, server_name, broker_symbol, server_timezone, bars

    def upsert(self, account_id: str, server: str, payload: dict[str, Any]) -> int:
        account, server_name, symbol, server_timezone, bars = self._validate_batch(account_id, server, payload)
        if not bars:
            return 0
        connection = self._connect()
        try:
            with connection:
                connection.executemany(
                    """INSERT INTO closed_candles
                    (account_id, server, broker_symbol, server_timezone, candle_time,
                     open, high, low, close, tick_volume, spread, row_index)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(account_id, server, broker_symbol, server_timezone, candle_time)
                    DO UPDATE SET open=excluded.open, high=excluded.high, low=excluded.low,
                      close=excluded.close, tick_volume=excluded.tick_volume,
                      spread=excluded.spread, row_index=excluded.row_index""",
                    [(account, server_name, symbol, server_timezone, bar["t"], bar["o"], bar["h"], bar["l"], bar["c"], bar["tick_volume"], bar["spread"], bar["i"]) for bar in bars],
                )
            return len(bars)
        finally:
            connection.close()

    upsert_batch = upsert
    upsert_closed_bars = upsert

    def recent(self, account_id: str, server: str, broker_symbol: str, server_timezone: str, limit: int = _DEFAULT_LIMIT) -> list[dict[str, Any]]:
        try:
            amount = int(limit)
        except (TypeError, ValueError, OverflowError) as exc:
            raise ValueError("CANDLE_LIMIT_INVALID") from exc
        if amount < 1 or amount > _MAX_READ:
            raise ValueError("CANDLE_LIMIT_INVALID")
        if any(value is None for value in (account_id, server, broker_symbol, server_timezone)):
            raise ValueError("CANDLE_SCOPE_INVALID")
        scope = (str(account_id).strip(), str(server).strip(), str(broker_symbol).strip(), str(server_timezone).strip())
        if not all(scope):
            raise ValueError("CANDLE_SCOPE_INVALID")
        connection = self._connect()
        try:
            rows = connection.execute(
                """SELECT candle_time, open, high, low, close, tick_volume, spread, row_index
                   FROM closed_candles WHERE account_id=? AND server=? AND broker_symbol=?
                   AND server_timezone=? ORDER BY candle_time DESC LIMIT ?""", (*scope, amount)
            ).fetchall()
        finally:
            connection.close()
        # The stored row index belongs to the source request that wrote it.
        # Rebase indices for the bounded tail so a recovery response remains
        # a valid standalone candle window even when it came from a larger
        # historical range.
        return [{"i": index, "o": row[1], "h": row[2], "l": row[3], "c": row[4], "t": row[0], "r": "N", "tick_volume": row[5], "spread": row[6]} for index, row in enumerate(reversed(rows))]

    read_recent = recent
    read_recent_closed_bars = recent


__all__ = ["ClosedCandleStore"]
