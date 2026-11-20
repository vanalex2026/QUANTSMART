"""MFE market-data bridge plus an isolated, user-confirmed Demo-only adapter.

Copyright 2026 MFE Workspace contributors. Licensed under Apache-2.0.
The SDK is imported lazily; Linux/macOS and missing SDKs remain valid offline states.
"""
from __future__ import annotations

import importlib
import asyncio
import copy
import json
import math
import os
import re
import secrets
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI, Request, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, SecretStr, ConfigDict
if __package__:
    from .demo_execution import DemoExecution, DemoPreviewInput, DemoSubmitInput
    from .broker_deals import read_demo_deals
    from .demo_automation import DemoAutomation, AutoStart, AutoAction
    from .closed_candle_store import ClosedCandleStore
else:
    from demo_execution import DemoExecution, DemoPreviewInput, DemoSubmitInput
    from broker_deals import read_demo_deals
    from demo_automation import DemoAutomation, AutoStart, AutoAction
    from closed_candle_store import ClosedCandleStore

AUTHORITY = {"authority": "SHADOW_ONLY", "decision": "NO_DECISION", "live_apply_allowed": False, "read_only": True}
# The bridge currently exposes descriptive bars/indicators only. Keep the
# absence of a forecast provider explicit in every advisory-shaped response;
# callers must not infer a forecast merely because a live bundle is populated.
NO_FORECAST_SOURCE = {
    "ok": False,
    "reason": "NO_ADVISORY_SOURCE",
    "source": "NONE",
    "source_disclosure": "No forecast source is connected; this bundle contains descriptive closed-bar observations only.",
    **AUTHORITY,
}
HISTORY_CONTRACT_VERSION = 2
HISTORY_CLOSED_BAR_PROVENANCE = "MT5_CLOSED_BARS"
PROCESS_STARTED_AT = time.time()
# Rates are a short-lived in-process tail cache.  A monotonic clock should
# never make a future-dated entry look fresh (for example after a suspended
# process or a test clock adjustment), so cache acceptance is bounded on both
# sides of this age window below.
RATES_CACHE_MAX_AGE_SECONDS = 3.0
TF_MINUTES = {"M1": 1, "M5": 5, "M15": 15, "M30": 30, "H1": 60, "H4": 240, "D1": 1440, "W1": 10080}
# Pattern Atlas history is intentionally limited to these closed-bar frames.
# Keep M1 available to the forming-bar/rates and tick diagnostics paths, but
# never allow a closed range request to create an M1 "three-year" research
# tape. The browser adapter has the same allowlist; enforcing it here closes
# direct bridge/API callers as well.
HISTORY_TIMEFRAMES = {"M5", "M15", "M30", "H1"}
# Closed-bar research/rates callers are deliberately scoped to the same four
# Pattern Atlas frames.  Higher frames remain available to the live bundle as
# derived context, but a direct closed-bar request must never silently turn an
# M1 (or another out-of-scope frame) into cached research evidence.
CLOSED_BAR_TIMEFRAMES = frozenset(HISTORY_TIMEFRAMES)
LIVE_CONTEXT_TIMEFRAMES = frozenset({"H4", "D1", "W1"})
GOLD_ALIASES = ("XAUUSD", "GOLD", "GOLD#", "XAUUSDm", "XAUUSD.a", "XAUUSD.pro", "GOLDmicro")


def tick_stream_limit() -> int:
    """Allow several local chart tabs without removing a bounded resource cap."""
    try:
        configured = int(os.environ.get("MFE_MAX_TICK_STREAMS", "16"))
    except (TypeError, ValueError):
        configured = 16
    return max(1, min(configured, 64))


def numeric(value: Any) -> float | None:
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError, OverflowError):
        return None


class ConnectInput(BaseModel):
    terminal_path: str = Field(default="", max_length=1024)
    login: str = Field(default="", max_length=24, pattern=r"^\d*$")
    password: SecretStr | None = None
    server: str = Field(default="", max_length=128)

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)


class SymbolInput(BaseModel):
    symbol: str = Field(min_length=3, max_length=64)
    broker_symbol: str = Field(default="", max_length=80)

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)


def indicators(bars: list[dict]) -> dict:
    # Same EMA and Wilder ATR recurrence as the historical observation adapter.
    fast = slow = bars[0]["c"]
    atr = bars[0]["h"] - bars[0]["l"]
    for i, bar in enumerate(bars[1:], 1):
        fast += (bar["c"] - fast) * (2 / 11)
        slow += (bar["c"] - slow) * (2 / 35)
        previous = bars[i - 1]["c"]
        true_range = max(bar["h"] - bar["l"], abs(bar["h"] - previous), abs(bar["l"] - previous))
        atr = (atr * 13 + true_range) / 14
    return {"ema10": fast, "ema34": slow, "atr14": atr if len(bars) > 1 else atr or 1}


class TerminalService:
    def __init__(self, sdk: Any = None, platform: str | None = None, server_timezone: str = "UTC"):
        self.sdk = sdk
        self.platform = platform or sys.platform
        self.lock = threading.RLock()
        self.attached = False
        self.reason = "NOT_ATTACHED"
        self.generation = secrets.randbelow(1_000_000_000) + 1
        self.account_identity = None
        self.overrides: dict[str, str] = {}
        self.cache: dict[tuple, tuple[float, dict]] = {}
        self.closed_candle_store = ClosedCandleStore()
        # Only a database created before this process started can serve as a
        # restart fallback. A same-process empty read must remain authoritative
        # so a transient broker gap cannot hide a newly closed candle.
        try:
            self._store_recovery_enabled = (
                self.closed_candle_store.path.exists()
                and self.closed_candle_store.path.stat().st_mtime < PROCESS_STARTED_AT
            )
        except OSError:
            self._store_recovery_enabled = False
        # The timezone is part of the closed-bar provenance contract.  A typo
        # in MFE_MT5_SERVER_TIMEZONE must not take the bridge process down at
        # import/startup, and it must never silently turn broker-local epochs
        # into apparently trustworthy UTC bars.  Retain the configured marker
        # for diagnostics while making all bar reads fail closed below.
        configured_timezone = str(server_timezone or "UTC").strip() or "UTC"
        self.server_timezone_name = configured_timezone
        try:
            self.server_timezone = ZoneInfo(configured_timezone)
            self.server_timezone_valid = True
        except (ZoneInfoNotFoundError, ValueError):
            self.server_timezone = ZoneInfo("UTC")
            self.server_timezone_valid = False
        self.tick_symbols: dict[tuple, str] = {}

    def _invalidate_terminal_session(self) -> None:
        """Forget every value that was obtained from the attached terminal.

        The Python SDK can raise while a terminal is restarting (rather than
        returning ``None``). Treat that as a lost session so a stale account
        namespace cannot keep serving cached bars while the bridge is in an
        indeterminate state.
        """
        self.generation += 1
        self.cache.clear()
        self.overrides.clear()
        self.tick_symbols.clear()
        self.account_identity = None
        self.attached = False

    def market_time(self, value: Any) -> datetime:
        # Some terminal feeds encode broker wall-clock fields as an epoch value.
        # Use an explicit IANA timezone, including its historical DST rules.
        # UTC remains the default; never infer an offset from an old/stale tick.
        wall = datetime.fromtimestamp(int(value), timezone.utc).replace(tzinfo=None)
        return wall.replace(tzinfo=self.server_timezone).astimezone(timezone.utc)

    def query_time(self, value: datetime) -> datetime:
        # History requests are UTC contract values.  A naïve datetime would
        # otherwise be interpreted using the bridge process's local timezone
        # by ``astimezone`` (which varies across hosts), shifting the broker
        # query window and making a restart/non-UTC deployment ambiguous.
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("HISTORY_TIMESTAMP_MUST_INCLUDE_TIMEZONE")
        return value.astimezone(self.server_timezone).replace(tzinfo=timezone.utc)

    def capability(self) -> dict:
        if self.sdk is None:
            if self.platform != "win32":
                return {"supported": False, "reason": "NATIVE_MT5_REQUIRES_WINDOWS"}
            try:
                self.sdk = importlib.import_module("MetaTrader5")
            except (ImportError, OSError):
                return {"supported": False, "reason": "MT5_PACKAGE_UNAVAILABLE"}
        return {"supported": True, "reason": self.reason}

    def _initialization_failure_reason(self) -> str:
        """Map the SDK's safe error tuple to a stable UI contract code.

        MetaTrader5 exposes ``last_error()`` as ``(code, message)``.  The
        message can contain terminal details, so only the well-known
        authorization code is promoted; raw SDK text is never returned.
        """
        try:
            error = self.sdk.last_error()
            code = error[0] if isinstance(error, (tuple, list)) and error else None
            message = str(error[1]) if isinstance(error, (tuple, list)) and len(error) > 1 else ""
            if code == -6 or "authorization" in message.lower():
                return "MT5_AUTHORIZATION_FAILED"
        except Exception:
            pass
        return "MT5_INITIALIZE_FAILED"

    def account(self) -> dict:
        with self.lock:
            capability = self.capability()
            base = {**AUTHORITY, **capability, "connected": False, "account_kind": "UNKNOWN", "trade_allowed": False, "generation": self.generation}
            if not capability["supported"] or not self.attached:
                return {**base, "reason": capability["reason"]}
            try:
                account, terminal = self.sdk.account_info(), self.sdk.terminal_info()
                if account is None or terminal is None or not terminal.connected:
                    # A running bridge can outlive an MT5 terminal restart.
                    # Drop the attachment and all terminal-derived state as
                    # soon as the SDK reports that session is gone; otherwise
                    # the next poll could look like the same account and reuse
                    # bars/symbol mappings from before the restart.
                    if self.attached or self.account_identity is not None or self.cache or self.overrides or self.tick_symbols:
                        self._invalidate_terminal_session()
                    return {**base, "reason": "TERMINAL_DISCONNECTED", "generation": self.generation}
                identity = (str(account.login), str(account.server))
                if self.account_identity is not None and identity != self.account_identity:
                    self.generation += 1
                    self.cache.clear()
                    self.overrides.clear()
                    self.tick_symbols.clear()
                self.account_identity = identity
                mode = int(account.trade_mode)
                kind = "DEMO" if mode == getattr(self.sdk, "ACCOUNT_TRADE_MODE_DEMO", 0) else "REAL" if mode == getattr(self.sdk, "ACCOUNT_TRADE_MODE_REAL", 2) else "UNKNOWN"
                return {**base, "connected": True, "reason": None, "account_id": str(account.login), "account_kind": kind,
                        "server": str(account.server), "broker": str(getattr(account, "company", "")),
                        "balance": numeric(account.balance), "equity": numeric(account.equity), "currency": str(account.currency),
                        "max_bars": int(getattr(terminal, "maxbars", 0) or 0) or None, "generation": self.generation}
            except Exception:
                # A restarting SDK commonly raises instead of returning a
                # disconnected terminal. Do not leave the old namespace and
                # cache valid across that failure; force a fresh attach.
                self._invalidate_terminal_session()
                return {**base, "reason": "ACCOUNT_UNAVAILABLE", "generation": self.generation}

    def connect(self, settings: ConnectInput) -> dict:
        with self.lock:
            capability = self.capability()
            self.generation += 1
            self.cache.clear()
            self.overrides.clear()
            self.tick_symbols.clear()
            if not capability["supported"]:
                return {"ok": False, **self.account()}
            # Detach only this Python IPC session; never close the terminal or positions.
            if self.attached:
                self.sdk.shutdown()
            self.attached = False
            self.reason = "NOT_ATTACHED"
            self.account_identity = None
            path = settings.terminal_path.strip()
            if path and (not Path(path).is_absolute() or path.startswith("\\\\") or Path(path).name.lower() not in {"terminal64.exe", "terminal.exe", "metatrader64.exe", "metatrader.exe"} or not Path(path).is_file()):
                self.reason = "INVALID_TERMINAL_PATH"
                return {"ok": False, **self.account()}
            kwargs: dict[str, Any] = {"timeout": 10000}
            if settings.login:
                if not settings.server:
                    self.reason = "SERVER_REQUIRED_FOR_ACCOUNT_SWITCH"
                    return {"ok": False, **self.account()}
                kwargs["login"], kwargs["server"] = int(settings.login), settings.server.strip()
                if settings.password:
                    kwargs["password"] = settings.password.get_secret_value()
            elif settings.password or settings.server:
                self.reason = "LOGIN_REQUIRED_FOR_ACCOUNT_SWITCH"
                return {"ok": False, **self.account()}
            try:
                self.attached = bool(self.sdk.initialize(path, **kwargs) if path else self.sdk.initialize(**kwargs))
                if not self.attached:
                    self.reason = self._initialization_failure_reason()
                result = self.account()
                return {"ok": bool(result["connected"]), **result}
            except Exception:
                self.reason = "MT5_INITIALIZE_FAILED"
                return {"ok": False, **self.account()}
            finally:
                kwargs.clear()  # No credentials are retained in this service, files, logs or URLs.

    def disconnect(self) -> dict:
        with self.lock:
            if self.attached and self.sdk:
                self.sdk.shutdown()
            self.attached = False
            self.account_identity = None
            self.reason = "NOT_ATTACHED"
            self.generation += 1
            self.overrides.clear()
            self.cache.clear()
            self.tick_symbols.clear()
            return {"ok": True, **self.account()}

    def symbols(self, canonical: str) -> list[dict]:
        if not re.fullmatch(r"[A-Za-z0-9_.#-]{3,64}", canonical):
            return []
        canonical = canonical.upper()
        candidates = []
        aliases = [s.upper() for s in GOLD_ALIASES] if canonical in {"XAUUSD", "GOLD"} else [canonical]
        for item in self.sdk.symbols_get() or ():
            name = str(item.name)
            upper = name.upper()
            gold = canonical in {"XAUUSD", "GOLD"}
            base = str(getattr(item, "currency_base", "")).upper()
            quote = str(getattr(item, "currency_profit", "")).upper()
            named_match = bool(re.fullmatch(r"(?:XAUUSD|GOLD)(?:[._#-].*|MICRO|M|C|PRO)?", upper)) if gold else bool(re.fullmatch(re.escape(canonical) + r"(?:[._#-].*|MICRO|M|C|PRO)?", upper))
            pair_match = (base == "XAU" and quote == "USD") if gold else len(canonical) == 6 and base == canonical[:3] and quote == canonical[3:]
            match = upper in aliases or named_match or pair_match
            if not match or bool(getattr(item, "custom", False)) or int(getattr(item, "expiration_time", 0) or 0):
                continue
            quote = str(getattr(item, "currency_profit", "")).upper()
            expected_quote = "USD" if gold else canonical[3:] if len(canonical) == 6 and canonical.isalpha() else ""
            if expected_quote and quote and quote != expected_quote:
                continue
            rank = aliases.index(upper) if upper in aliases else len(aliases)
            candidates.append({"name": name, "description": str(getattr(item, "description", "")), "base": str(getattr(item, "currency_base", "")), "quote": quote, "rank": rank})
        return sorted(candidates, key=lambda item: (item["rank"], item["name"]))

    def resolve(self, canonical: str, override: str = "") -> dict:
        with self.lock:
            account = self.account()
            if not account["connected"]:
                # Preserve the ordinary detached response, but surface a
                # typed history transport failure after an SDK restart.  The
                # account probe has already purged the terminal namespace;
                # callers must not mistake this for a cacheable symbol miss.
                reason = "HISTORY_UNAVAILABLE" if account.get("reason") == "ACCOUNT_UNAVAILABLE" else "NOT_CONNECTED"
                return {"ok": False, "reason": reason, "candidates": []}
            try:
                candidates = self.symbols(canonical)
            except Exception:
                # symbols_get can raise while MT5 is restarting. Keep the
                # bridge's history/bars APIs typed and invalidate every value
                # associated with the lost SDK generation before retry.
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "candidates": []}
            name = override or self.overrides.get(canonical.upper(), "") or (candidates[0]["name"] if candidates else "")
            if not name or name not in {item["name"] for item in candidates}:
                return {"ok": False, "reason": "SYMBOL_NOT_FOUND", "canonical_symbol": canonical, "candidates": candidates}
            try:
                selected = self.sdk.symbol_select(name, True)
            except Exception:
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "candidates": candidates}
            if not selected:
                return {"ok": False, "reason": "SYMBOL_SELECTION_FAILED", "candidates": candidates}
            if override:
                self.overrides[canonical.upper()] = name
                self.cache.clear()
            return {"ok": True, "canonical_symbol": canonical, "broker_symbol": name, "candidates": candidates, "generation": self.generation}

    def rates(self, canonical: str, tf: str, count: int = 600, forming: bool = False, use_cache: bool = True,
              allow_extended_closed: bool = False) -> dict:
        with self.lock:
            contract = {"source": "MT5_CLOSED_BARS" if not forming else "MT5_FORMING_BAR",
                        # Keep the frame attached to every response, including
                        # validation/transport failures.  Saved-history
                        # callers must never have to infer a frame from the
                        # request URL when diagnosing or persisting evidence.
                        "timeframe": tf,
                        "closed_bar_provenance": HISTORY_CLOSED_BAR_PROVENANCE if not forming else None,
                        "forming_bar_included": bool(forming), "server_timezone": self.server_timezone_name,
                        "timestamp_basis": "UTC", "cache_hit": False,
                        "cache_age_seconds": None, "retrieved_at": None,
                        "latest_closed_bar_age_seconds": None, **AUTHORITY}
            if not self.server_timezone_valid:
                return {"ok": False, "reason": "INVALID_SERVER_TIMEZONE", "bars": [], **contract}
            if tf not in TF_MINUTES or count < 1 or count > 5000:
                return {"ok": False, "reason": "INVALID_BAR_REQUEST", "bars": [], **contract}
            # M1 is retained for the forming-bar/tick diagnostics paths, but
            # it is not a trustworthy closed-bar research feed.  Keep this
            # guard at the bridge boundary so direct API callers cannot seed
            # the short-lived cache with an out-of-scope timeframe.  The live
            # bundle opts into H4/D1/W1 only as derived context below.
            if (not forming and tf not in CLOSED_BAR_TIMEFRAMES
                    and not (allow_extended_closed and tf in LIVE_CONTEXT_TIMEFRAMES)):
                # Evict any legacy entry for this timeframe as well.  A
                # process upgrade can leave an M1 tail in memory; retaining it
                # would make the forbidden namespace reusable if a future
                # caller bypassed this guard.
                for cache_key in list(self.cache):
                    try:
                        if len(cache_key) > 2 and cache_key[2] == tf:
                            self.cache.pop(cache_key, None)
                    except (TypeError, IndexError):
                        continue
                return {"ok": False, "reason": "UNSUPPORTED_HISTORY_TIMEFRAME", "bars": [], **contract}
            resolved = self.resolve(canonical)
            if not resolved["ok"]:
                return {**resolved, "bars": [], **contract}
            name = resolved["broker_symbol"]
            key = (self.generation, name, tf, count, forming)
            cached = self.cache.get(key)
            cache_age = None
            cache_payload = cached[1] if isinstance(cached, tuple) and len(cached) == 2 else None
            # A cache entry is an optimization, never a source of authority.
            # In particular, do not let an old/hand-edited payload with a
            # missing closed-bar marker bypass the read-only contract.  This
            # also protects callers upgrading from the pre-provenance cache:
            # those entries are discarded and refetched from MT5.
            cache_payload_valid = isinstance(cache_payload, dict)
            if not forming:
                cache_payload_valid = (
                    cache_payload_valid
                    and cache_payload.get("ok") is True
                    and bool(cache_payload.get("bars"))
                    and cache_payload.get("timeframe") == tf
                    and cache_payload.get("source") == HISTORY_CLOSED_BAR_PROVENANCE
                    and cache_payload.get("closed_bar_provenance") == HISTORY_CLOSED_BAR_PROVENANCE
                    and cache_payload.get("forming_bar_included") is False
                    # Broker-local epochs are normalized using the configured
                    # IANA timezone. A cache entry produced under another
                    # timezone is a different observation and must be
                    # refetched instead of being reused as closed history.
                    and cache_payload.get("server_timezone") == self.server_timezone_name
                    and cache_payload.get("timestamp_basis") == "UTC"
                    and cache_payload.get("read_only") is True
                    and cache_payload.get("authority") == "SHADOW_ONLY"
                    and cache_payload.get("decision") == "NO_DECISION"
                    and cache_payload.get("live_apply_allowed") is False
                )
            if cached:
                try:
                    cache_age = time.monotonic() - float(cached[0])
                except (IndexError, KeyError, TypeError, ValueError, OverflowError):
                    # Cache state is an optimization, never an authority. A
                    # malformed timestamp must fall through to MT5 rather
                    # than escaping as an internal bridge error.
                    cache_age = None
            # Treat negative/non-finite ages as cache misses.  Clamping the
            # diagnostic age to zero while accepting a future-dated entry can
            # otherwise keep stale closed M5/M15/M30/H1 data alive forever.
            if use_cache and cached and cache_payload_valid and cache_age is not None and math.isfinite(cache_age) and 0 <= cache_age < RATES_CACHE_MAX_AGE_SECONDS:
                # Keep the payload immutable in the cache, but refresh the
                # diagnostics on every hit.  A caller must be able to tell
                # whether a closed-bar window was served from the short-lived
                # bridge cache and how old its newest candle is.
                age = cache_age
                # Return an isolated copy. Direct Python callers (and tests)
                # can otherwise mutate the cached bars list through the
                # shallow dict returned here, changing the next response's
                # evidence without another MT5 read.
                result = copy.deepcopy(cache_payload)
                result["cache_hit"] = True
                result["cache_age_seconds"] = round(age, 3)
                bars = result.get("bars") or []
                if bars and not forming:
                    try:
                        latest = datetime.fromisoformat(str(bars[-1]["t"]).replace("Z", "+00:00")).timestamp()
                        result["latest_closed_bar_age_seconds"] = round(max(0.0, time.time() - (latest + TF_MINUTES[tf] * 60)), 3)
                    except (KeyError, TypeError, ValueError, OverflowError, OSError):
                        result["latest_closed_bar_age_seconds"] = None
                return result
            # Do not retain malformed, future-dated, or non-provenance cache
            # entries.  Otherwise every read would repeatedly inspect the same
            # untrusted value and a later code path could accidentally accept
            # it as closed history.
            if cached and (not cache_payload_valid or cache_age is None or not math.isfinite(cache_age) or cache_age < 0):
                self.cache.pop(key, None)
            # A caller that bypasses the short-lived cache (or a cache entry
            # that just expired) is asking the terminal for authoritative
            # evidence. Evict the old tail before that read so an empty or
            # malformed SDK response cannot leave stale closed bars available
            # to the next cache-enabled request.
            if not (use_cache and cached and cache_payload_valid and cache_age is not None
                    and math.isfinite(cache_age) and 0 <= cache_age < RATES_CACHE_MAX_AGE_SECONDS):
                self.cache.pop(key, None)
            try:
                data = self.sdk.copy_rates_from_pos(name, getattr(self.sdk, "TIMEFRAME_" + tf), 0 if forming else 1, count)
            except Exception:
                # A native SDK call can raise while the terminal is being
                # restarted. Return the same typed, provenance-bearing failure
                # as range history and invalidate the old cache namespace.
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "bars": [], **contract}
            # MetaTrader5 uses ``None`` for both an empty range and a terminal
            # that disappeared during the request.  Probe the session before
            # treating it as an ordinary market-data miss; otherwise a stale
            # account namespace and cache could survive a restart and be
            # reused by the next closed-bar read.
            if data is None:
                try:
                    probe, account = self.sdk.terminal_info(), self.sdk.account_info()
                    session_connected = bool(probe is not None and getattr(probe, "connected", False) and account is not None)
                    if session_connected and self.account_identity is not None:
                        identity = (str(account.login), str(account.server))
                        session_connected = identity == self.account_identity
                except Exception:
                    session_connected = False
                if not session_connected:
                    self._invalidate_terminal_session()
                    return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "bars": [], **contract}
            # The native SDK normally returns a structured array, but a
            # restarting terminal (and some SDK shims) can hand back a scalar
            # or another non-iterable payload.  Normalize that boundary here
            # just like range history does: a malformed response is a typed
            # data failure and must never escape as a generic 503 or become a
            # cacheable closed-bar window.
            try:
                raw_rows = [] if data is None else list(data)
            except (TypeError, ValueError, OverflowError):
                return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
            bars = []
            seen_times: set[str] = set()
            for i, item in enumerate(raw_rows):
                if not forming:
                    try:
                        raw_epoch = numeric(item["time"])
                        period_seconds = TF_MINUTES[tf] * 60
                        if raw_epoch is None or raw_epoch != math.floor(raw_epoch):
                            raise ValueError("HISTORY_TIMESTAMP_NOT_ALIGNED")
                        raw_wall = datetime.fromtimestamp(int(raw_epoch), timezone.utc)
                        if raw_wall.second != 0 or (raw_wall.minute * 60 + raw_wall.second) % period_seconds:
                            raise ValueError("HISTORY_TIMESTAMP_NOT_ALIGNED")
                    except (KeyError, TypeError, ValueError, OverflowError, OSError):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                try:
                    observed_time = self.market_time(item["time"])
                except (KeyError, TypeError, ValueError, OverflowError, OSError):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                if not forming and observed_time.timestamp() + TF_MINUTES[tf] * 60 > time.time() + 1:
                    continue
                try:
                    values = [numeric(item[field]) for field in ("open", "high", "low", "close")]
                except (KeyError, TypeError, IndexError):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                if any(value is None for value in values):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                open_, high, low, close = values
                if high < max(open_, close, low) or low > min(open_, close, high):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                try:
                    tick_volume, spread = int(item["tick_volume"]), int(item["spread"])
                except (KeyError, TypeError, ValueError, OverflowError):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                if tick_volume < 0 or spread < 0:
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                stamp = observed_time.isoformat(timespec="seconds").replace("+00:00", "Z")
                if stamp in seen_times:
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], **contract}
                seen_times.add(stamp)
                bars.append({"i": i, "o": values[0], "h": values[1], "l": values[2], "c": values[3], "t": stamp, "r": "N", "tick_volume": tick_volume, "spread": spread})
            bars.sort(key=lambda bar: bar["t"])
            closed_source = HISTORY_CLOSED_BAR_PROVENANCE if not forming else "MT5_FORMING_BAR"
            retrieved_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
            latest_age = None
            if bars and not forming:
                latest_age = round(max(0.0, time.time() - (datetime.fromisoformat(bars[-1]["t"].replace("Z", "+00:00")).timestamp() + TF_MINUTES[tf] * 60)), 3)
            result = {"ok": bool(bars), "reason": None if bars else "NO_MARKET_DATA", "bars": bars, "symbol": canonical, "broker_symbol": name, "timeframe": tf, "source": closed_source, "closed_bar_provenance": closed_source if not forming else None, "forming_bar_included": bool(forming), "server_timezone": self.server_timezone_name, "timestamp_basis": "UTC", "cache_hit": False, "cache_age_seconds": 0.0, "retrieved_at": retrieved_at, "latest_closed_bar_age_seconds": latest_age, **AUTHORITY}
            if not forming and result["ok"] and self.account_identity:
                try:
                    self.closed_candle_store.upsert(self.account_identity[0], self.account_identity[1], result)
                except Exception:
                    # Durable storage accelerates restart recovery, but never
                    # changes the live read result or its authority boundary.
                    pass
            if not forming and not result["ok"] and self._store_recovery_enabled and self.account_identity and tf == "M5":
                try:
                    stored = self.closed_candle_store.recent(self.account_identity[0], self.account_identity[1], name, self.server_timezone_name, count)
                except Exception:
                    stored = []
                if stored:
                    stored_latest = stored[-1]["t"]
                    stored_age = round(max(0.0, time.time() - (datetime.fromisoformat(stored_latest.replace("Z", "+00:00")).timestamp() + TF_MINUTES[tf] * 60)), 3)
                    result = {**result, "ok": True, "reason": "CLOSED_CANDLE_STORE_FALLBACK", "bars": stored,
                              "cache_hit": True, "cache_age_seconds": None,
                              "retrieved_at": retrieved_at, "latest_closed_bar_age_seconds": stored_age}
            # Empty/failing reads are deliberately not cached.  A temporary
            # broker retention gap must not hide newly closed bars for the
            # cache TTL while still reporting MT5_CLOSED_BARS provenance.
            if result["ok"]:
                # Keep the cached evidence detached from the object returned
                # to direct callers, whose mutation must not alter later
                # reads or its provenance markers.
                self.cache[key] = (time.monotonic(), copy.deepcopy(result))
                if len(self.cache) > 48:
                    self.cache.pop(next(iter(self.cache)))
            return result

    def ticks(self, canonical: str, tf: str, cursor: str = "") -> dict:
        """Read every terminal tick after a millisecond/ordinal cursor, not just last price."""
        with self.lock:
            account = self.account()
            if not account["connected"]:
                return {"ok": False, "reason": account.get("reason"), **AUTHORITY}
            if tf not in TF_MINUTES or not re.fullmatch(r"[A-Za-z0-9_.#-]{3,64}", canonical):
                return {"ok": False, "reason": "INVALID_TICK_REQUEST", **AUTHORITY}
            previous_ms = previous_ordinal = 0
            if cursor:
                try:
                    gen, previous_ms, previous_ordinal = map(int, cursor.split(":"))
                    if min(gen, previous_ms, previous_ordinal) < 0:
                        raise ValueError()
                except (ValueError, TypeError):
                    return {"ok": False, "reason": "INVALID_TICK_CURSOR", **AUTHORITY}
                if gen != self.generation:
                    return {"ok": False, "reason": "TERMINAL_CHANGED", **AUTHORITY}
            symbol_key = (self.generation, canonical.upper(), self.overrides.get(canonical.upper()))
            name = self.tick_symbols.get(symbol_key)
            if not name:
                resolved = self.resolve(canonical)
                if not resolved["ok"]:
                    return resolved
                name = resolved["broker_symbol"]
                self.tick_symbols[symbol_key] = name
                if len(self.tick_symbols) > 16:
                    self.tick_symbols.pop(next(iter(self.tick_symbols)))
            try:
                latest = self.sdk.symbol_info_tick(name)
            except Exception:
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "TICK_HISTORY_UNAVAILABLE", **AUTHORITY}
            if latest is None:
                return {"ok": False, "reason": "NO_MARKET_DATA", **AUTHORITY}
            try:
                latest_msc = numeric(getattr(latest, "time_msc", 0))
                latest_seconds = numeric(getattr(latest, "time", 0))
                latest_ms = int(latest_msc) if latest_msc and latest_msc > 0 else int(latest_seconds * 1000) if latest_seconds and latest_seconds > 0 and latest_seconds == math.floor(latest_seconds) else 0
            except (TypeError, ValueError, OverflowError):
                latest_ms = 0
            if latest_ms <= 0:
                return {"ok": False, "reason": "INVALID_TICK_OBSERVATION", **AUTHORITY}
            start_ms = previous_ms or latest_ms
            # Query the inclusive second and count equal-ms rows to preserve duplicates.
            start = datetime.fromtimestamp(start_ms // 1000, timezone.utc)
            try:
                raw = self.sdk.copy_ticks_from(name, start, 8192, self.sdk.COPY_TICKS_ALL)
            except Exception:
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "TICK_HISTORY_UNAVAILABLE", **AUTHORITY}
            if raw is None:
                return {"ok": False, "reason": "TICK_HISTORY_UNAVAILABLE", **AUTHORITY}
            try:
                raw_rows = list(raw)
            except (TypeError, ValueError, OverflowError):
                return {"ok": False, "reason": "INVALID_TICK_OBSERVATION", **AUTHORITY}
            ticks = []
            last_ms = previous_ms
            last_ordinal = previous_ordinal
            group_ms = group_count = 0
            prior_raw_ms = None
            for item in raw_rows:
                try:
                    try:
                        raw_time_msc = numeric(item["time_msc"])
                    except (KeyError, TypeError, IndexError):
                        raw_time_msc = None
                    try:
                        raw_time = numeric(item["time"])
                    except (KeyError, TypeError, IndexError):
                        raw_time = None
                    if raw_time_msc is None or raw_time_msc <= 0:
                        if raw_time is None or raw_time <= 0 or raw_time != math.floor(raw_time):
                            raise ValueError("INVALID_TICK_TIMESTAMP")
                        raw_ms = int(raw_time) * 1000
                    elif raw_time_msc != math.floor(raw_time_msc):
                        raise ValueError("INVALID_TICK_TIMESTAMP")
                    else:
                        raw_ms = int(raw_time_msc)
                    if prior_raw_ms is not None and raw_ms < prior_raw_ms:
                        raise ValueError("TICK_ORDER_INVALID")
                    prior_raw_ms = raw_ms
                    bid, ask, last = (numeric(item[field]) for field in ("bid", "ask", "last"))
                    volume = numeric(item["volume"])
                    flags = numeric(item["flags"])
                    if (bid is None or ask is None or last is None or volume is None or flags is None
                            or volume < 0 or flags != math.floor(flags) or flags < 0
                            or bid <= 0 or ask < bid):
                        raise ValueError("INVALID_TICK_PRICE")
                except (KeyError, TypeError, ValueError, OverflowError):
                    return {"ok": False, "reason": "INVALID_TICK_OBSERVATION", **AUTHORITY}
                if raw_ms < previous_ms:
                    continue
                group_count = group_count + 1 if raw_ms == group_ms else 1
                group_ms = raw_ms
                if raw_ms == previous_ms and group_count <= previous_ordinal:
                    continue
                utc_ms = int(self.market_time(raw_ms // 1000).timestamp()) * 1000 + raw_ms % 1000
                ticks.append({"time_msc": utc_ms, "bid": bid, "ask": ask, "last": last, "volume": volume, "flags": int(flags)})
                last_ms, last_ordinal = raw_ms, group_count
            if len(raw_rows) >= 8192 and not ticks:
                return {"ok": False, "reason": "TICK_BACKLOG_OVERFLOW", **AUTHORITY}
            result = {"ok": True, "symbol": canonical, "broker_symbol": name, "timeframe": tf,
                      "generation": self.generation, "cursor": f"{self.generation}:{last_ms}:{last_ordinal}",
                      "ticks": ticks, "catching_up": len(raw_rows) >= 8192,
                      "received_at": datetime.now(timezone.utc).isoformat(), **AUTHORITY}
            if ticks or not cursor:
                # Small direct read, deliberately bypassing the slow historical cache.
                try:
                    raw_bars = self.sdk.copy_rates_from_pos(name, getattr(self.sdk, "TIMEFRAME_" + tf), 0, 2)
                except Exception:
                    self._invalidate_terminal_session()
                    return {"ok": False, "reason": "HISTORY_UNAVAILABLE", **AUTHORITY}
                try:
                    bar_rows = [] if raw_bars is None else list(raw_bars)
                except (TypeError, ValueError, OverflowError):
                    return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                converted = []
                seen_bar_times = set()
                for item in bar_rows:
                    try:
                        raw_bar_epoch = numeric(item["time"])
                        if (raw_bar_epoch is None or raw_bar_epoch <= 0
                                or raw_bar_epoch != math.floor(raw_bar_epoch)):
                            raise ValueError("BAR_TIMESTAMP_INVALID")
                    except (KeyError, TypeError, ValueError, OverflowError):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    try:
                        observed_time = self.market_time(item["time"])
                    except (KeyError, TypeError, ValueError, OverflowError, OSError):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    try:
                        values = [numeric(item[k]) for k in ("open", "high", "low", "close")]
                    except (KeyError, TypeError, IndexError):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    if any(value is None for value in values):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    open_, high, low, close = values
                    if high < max(open_, close, low) or low > min(open_, close, high):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    try:
                        tick_volume, spread = int(item["tick_volume"]), int(item["spread"])
                    except (KeyError, TypeError, ValueError, OverflowError):
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    if tick_volume < 0 or spread < 0:
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    stamp = observed_time.isoformat(timespec="seconds").replace("+00:00", "Z")
                    if stamp in seen_bar_times:
                        return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", **AUTHORITY}
                    seen_bar_times.add(stamp)
                    converted.append({"symbol": canonical, "timeframe": tf,
                                      "time": stamp,
                                      "open": values[0], "high": values[1], "low": values[2], "close": values[3],
                                      "tick_volume": tick_volume, "spread": spread})
                converted.sort(key=lambda item: item["time"])
                result["bar"] = converted[-1] if converted else None
                result["closed_bar"] = converted[-2] if len(converted) > 1 else None
            return result

    def bar(self, canonical: str, tf: str) -> dict:
        result = self.rates(canonical, tf, 1, True)
        if not result["ok"]:
            return {"bar": None, "reason": result["reason"], "source": "MT5_FORMING_BAR", "forming_bar_included": True, "server_timezone": self.server_timezone_name, "timestamp_basis": "UTC", **AUTHORITY}
        b = result["bars"][-1]
        return {"symbol": canonical, "broker_symbol": result["broker_symbol"], "timeframe": tf, "time": b["t"], "open": b["o"], "high": b["h"], "low": b["l"], "close": b["c"], "tick_volume": b["tick_volume"], "spread": b["spread"], "source": "MT5_FORMING_BAR", "forming_bar_included": True, "server_timezone": self.server_timezone_name, "timestamp_basis": "UTC", **AUTHORITY}

    def bundle(self, canonical: str, tf: str, count: int) -> dict:
        with self.lock:
            account = self.account()
            main = self.rates(canonical, tf, count, allow_extended_closed=True)
            observed = {}
            if main["ok"]:
                cutoff = datetime.fromisoformat(main["bars"][-1]["t"].replace("Z", "+00:00")).timestamp() + TF_MINUTES[tf] * 60
                for frame in dict.fromkeys((tf, "M15", "H1", "H4", "D1", "W1")):
                    tape = main if frame == tf else self.rates(canonical, frame, min(count, 600), allow_extended_closed=True)
                    aligned = [bar for bar in tape.get("bars", []) if datetime.fromisoformat(bar["t"].replace("Z", "+00:00")).timestamp() + TF_MINUTES[frame] * 60 <= cutoff]
                    if len(aligned) >= 35:
                        observed[frame] = {"as_of": aligned[-1]["t"], "indicators": indicators(aligned), "indicator_lookback": len(aligned)}
            return {"ok": bool(account["connected"] and main["ok"]), "account": account, "bars": main.get("bars", []), "symbol": main.get("symbol", canonical), "broker_symbol": main.get("broker_symbol"), "timeframe": main.get("timeframe", tf), "source": main.get("source"), "closed_bar_provenance": main.get("closed_bar_provenance"), "forming_bar_included": main.get("forming_bar_included"), "server_timezone": main.get("server_timezone"), "timestamp_basis": main.get("timestamp_basis"), "retrieved_at": main.get("retrieved_at"), "latest_closed_bar_age_seconds": main.get("latest_closed_bar_age_seconds"), "live_bar": self.bar(canonical, tf) if main["ok"] else {"bar": None, "reason": main.get("reason")}, "observations": observed.get(tf), "observations_by_tf": observed, "advice": dict(NO_FORECAST_SOURCE), "positions": [], **AUTHORITY}

    def spec(self, canonical: str) -> dict:
        with self.lock:
            resolved = self.resolve(canonical)
            if not resolved["ok"]:
                return resolved
            item = self.sdk.symbol_info(resolved["broker_symbol"])
            if item is None:
                return {"ok": False, "reason": "SPEC_UNAVAILABLE"}
            keys = ("digits", "point", "trade_tick_size", "trade_tick_value", "trade_contract_size", "volume_min", "volume_step", "volume_max", "swap_long", "swap_short")
            return {"ok": True, **resolved, **{key: numeric(getattr(item, key, None)) for key in keys}}

    def history(self, canonical: str, tf: str, start: str, end: str) -> dict:
        with self.lock:
            # Keep the range contract self-describing on every path, including
            # validation and symbol-resolution failures.  Callers use the
            # version/source/provenance markers to distinguish a usable empty
            # interval from an incompatible or unavailable bridge response;
            # dropping those fields on an early error made diagnostics depend
            # on which validation failed first.
            contract = {
                "source": "MT5_HISTORY",
                "contract_version": HISTORY_CONTRACT_VERSION,
                # A range response is self-describing even when it is empty
                # or rejected before symbol resolution.  This prevents a
                # saved M5/M15/M30/H1 chunk from being detached from its
                # timeframe during retries or cache diagnostics.
                "timeframe": tf,
                "closed_bar_provenance": HISTORY_CLOSED_BAR_PROVENANCE,
                "forming_bar_included": False,
                # Range callers assemble several bounded requests for the
                # three-year tape. Keep a transport-level row ratio visible
                # even when validation fails, rather than making callers
                # infer coverage from ``n`` (which is absent on some errors).
                "requested_bars": None,
                "returned_bars": 0,
                "coverage_ratio": 0.0,
                # Boundary/freshness markers make a partial range explicit.
                # ``coverage_ratio`` alone cannot tell whether the missing
                # rows are at the beginning, the end, or both (and an empty
                # range has no useful ``n`` to inspect).  Keep these markers
                # descriptive only; they never promote an incomplete tape.
                "coverage_start": None,
                "coverage_end": None,
                "coverage_status": "EMPTY",
                "latest_closed_bar_age_seconds": None,
                "server_timezone": self.server_timezone_name,
                "timestamp_basis": "UTC",
                **AUTHORITY,
            }
            if not self.server_timezone_valid:
                return {"ok": False, "reason": "INVALID_SERVER_TIMEZONE", "bars": [], **contract}
            # FastAPI normally supplies strings, but direct bridge callers and
            # test/integration shims can pass arbitrary values.  Keep those
            # malformed frames inside the typed history contract instead of
            # letting an unhashable value escape from the dictionary lookup.
            if not isinstance(tf, str) or tf not in TF_MINUTES:
                return {"ok": False, "reason": "INVALID_TIMEFRAME", "bars": [], **contract}
            if tf not in HISTORY_TIMEFRAMES:
                return {"ok": False, "reason": "UNSUPPORTED_HISTORY_TIMEFRAME", "bars": [], **contract}
            try:
                # ``str.replace`` below is intentionally guarded: a direct
                # caller supplying ``None``/a number must receive the same
                # versioned, fail-closed response as an invalid ISO string.
                if not isinstance(start, str) or not isinstance(end, str):
                    raise TypeError()
                first = datetime.fromisoformat(start.replace("Z", "+00:00"))
                last = datetime.fromisoformat(end.replace("Z", "+00:00"))
                # Keep the public range contract unambiguously UTC.  Explicit
                # offsets are accepted and normalized below; naïve strings are
                # refused instead of inheriting the host process timezone.
                if first.tzinfo is None or first.utcoffset() is None or last.tzinfo is None or last.utcoffset() is None:
                    raise ValueError("HISTORY_TIMESTAMP_MUST_INCLUDE_TIMEZONE")
                first = first.astimezone(timezone.utc)
                last = last.astimezone(timezone.utc)
                if last <= first or (last - first).total_seconds() / (TF_MINUTES[tf] * 60) > 50000:
                    raise ValueError()
            except ValueError as exc:
                reason = "HISTORY_TIMESTAMP_MUST_INCLUDE_TIMEZONE" if str(exc) == "HISTORY_TIMESTAMP_MUST_INCLUDE_TIMEZONE" else "INVALID_OR_EXCESSIVE_HISTORY_WINDOW"
                return {"ok": False, "reason": reason, "bars": [], **contract}
            except TypeError:
                return {"ok": False, "reason": "INVALID_OR_EXCESSIVE_HISTORY_WINDOW", "bars": [], **contract}
            resolved = self.resolve(canonical)
            if not resolved["ok"]:
                return {**resolved, "bars": [], **contract}
            try:
                terminal_info = self.sdk.terminal_info()
                max_bars = int(getattr(terminal_info, "maxbars", 0) or 0) or None
            except Exception:
                max_bars = None
            requested_bars = max(1, math.ceil((last - first).total_seconds() / (TF_MINUTES[tf] * 60)))
            contract["requested_bars"] = requested_bars
            # The terminal can disappear between account/resolve and the
            # range call (for example while MT5 is restarting).  Do not let a
            # vendor SDK exception escape as an untyped 500: callers would
            # lose the versioned provenance contract and could mistake a
            # retryable transport failure for an empty, cacheable range.
            try:
                data = self.sdk.copy_rates_range(resolved["broker_symbol"], getattr(self.sdk, "TIMEFRAME_" + tf), self.query_time(first), self.query_time(last))
            except Exception:
                # ``copy_rates_range`` may raise while the native terminal is
                # restarting instead of returning ``None``.  Treat that as a
                # lost SDK session and invalidate every terminal-derived value
                # before returning the typed history error.  Otherwise a later
                # request could reuse this generation's cache/override even
                # though the source that produced it no longer exists.
                self._invalidate_terminal_session()
                return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "bars": [], "n": 0,
                        "source": "MT5_HISTORY", "contract_version": HISTORY_CONTRACT_VERSION,
                        "broker_symbol": resolved["broker_symbol"], **contract}
            # MetaTrader5 returns ``None`` for both an empty/retained range and
            # a terminal that disappeared during the request.  Disambiguate
            # the latter before normalizing the payload: otherwise a lost
            # session is reported as ``NO_MARKET_DATA`` and its old account
            # namespace remains attached, allowing a three-year caller to
            # reuse cache/mappings from a terminal that no longer exists.
            if data is None:
                try:
                    probe, account = self.sdk.terminal_info(), self.sdk.account_info()
                    session_connected = bool(probe is not None and getattr(probe, "connected", False) and account is not None)
                    if session_connected and self.account_identity is not None:
                        identity = (str(account.login), str(account.server))
                        session_connected = identity == self.account_identity
                except Exception:
                    session_connected = False
                if not session_connected:
                    self._invalidate_terminal_session()
                    return {"ok": False, "reason": "HISTORY_UNAVAILABLE", "bars": [], "n": 0,
                            "source": "MT5_HISTORY", "contract_version": HISTORY_CONTRACT_VERSION,
                            "broker_symbol": resolved["broker_symbol"], **contract}
            # The native SDK normally returns a numpy structured array, but a
            # restarting/partially initialised terminal (or a test double) can
            # hand back a scalar or another non-iterable payload.  Normalize
            # the iterable boundary before touching ``len`` or looping so a
            # malformed range response stays inside the versioned history
            # contract instead of escaping as an untyped 503.
            try:
                raw_rows = [] if data is None else list(data)
            except (TypeError, ValueError, OverflowError):
                return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], "n": 0,
                        "source": "MT5_HISTORY", "contract_version": HISTORY_CONTRACT_VERSION,
                        "broker_symbol": resolved["broker_symbol"],
                        "closed_bar_provenance": HISTORY_CLOSED_BAR_PROVENANCE,
                        "forming_bar_included": False, "requested_bars": requested_bars,
                        "returned_bars": 0, "coverage_ratio": 0.0, "terminal_max_bars": max_bars,
                        "history_limit": None, "coverage_start": None, "coverage_end": None,
                        "coverage_status": "EMPTY", "latest_closed_bar_age_seconds": None,
                        "server_timezone": self.server_timezone_name,
                        "timestamp_basis": "UTC", **AUTHORITY}
            raw_count = len(raw_rows)
            bars = []
            invalid = False
            seen_times: set[str] = set()
            first_ts, last_ts = first.timestamp(), last.timestamp()
            for item in raw_rows:
                # A malformed SDK row must fail closed as a data error. Letting
                # KeyError/OverflowError escape here turns a bad broker slice
                # into a generic 503, which makes the three-year caller retry or
                # cache an ambiguous result.
                try:
                    observed_time = self.market_time(item["time"])
                except (KeyError, TypeError, ValueError, OverflowError, OSError):
                    invalid = True
                    continue
                observed_ts = observed_time.timestamp()
                # MT5 range calls can be inclusive and may return rows outside the
                # requested window. Enforce the bridge's [from,to) contract after
                # converting the broker wall clock to UTC before validating the
                # source row's candle alignment. An unrelated cached row outside
                # the requested slice must not poison an otherwise valid query.
                if observed_ts < first_ts or observed_ts >= last_ts:
                    continue
                try:
                    # MT5 timestamps are broker-wall-clock epoch seconds. A
                    # range request for M15 must not accept an M1-like row at
                    # 10:07, nor a fractional epoch silently truncated by
                    # ``int`` in ``market_time``. Validate the raw broker
                    # clock before converting it to UTC so half-hour and DST
                    # broker zones remain valid.
                    raw_epoch = numeric(item["time"])
                    if raw_epoch is None or raw_epoch != math.floor(raw_epoch):
                        raise ValueError("HISTORY_TIMESTAMP_NOT_ALIGNED")
                    raw_wall = datetime.fromtimestamp(int(raw_epoch), timezone.utc)
                    period_seconds = TF_MINUTES[tf] * 60
                    if raw_wall.second != 0 or (raw_wall.minute * 60 + raw_wall.second) % period_seconds:
                        raise ValueError("HISTORY_TIMESTAMP_NOT_ALIGNED")
                except (KeyError, TypeError, ValueError, OverflowError, OSError):
                    invalid = True
                    continue
                if observed_ts + TF_MINUTES[tf] * 60 > time.time():
                    continue
                try:
                    values = [numeric(item[k]) for k in ("open", "high", "low", "close")]
                except (KeyError, TypeError, IndexError):
                    invalid = True
                    continue
                if any(value is None for value in values):
                    invalid = True
                    continue
                open_, high, low, close = values
                if high < max(open_, close, low) or low > min(open_, close, high):
                    invalid = True
                    continue
                try:
                    tick_volume, spread = int(item["tick_volume"]), int(item["spread"])
                except (KeyError, TypeError, ValueError, OverflowError):
                    invalid = True
                    continue
                if tick_volume < 0 or spread < 0:
                    invalid = True
                    continue
                stamp = observed_time.isoformat(timespec="seconds").replace("+00:00", "Z")
                if stamp in seen_times:
                    # Duplicate timestamps are ambiguous for a closed-bar tape;
                    # do not silently deduplicate and change the broker's data.
                    invalid = True
                    continue
                seen_times.add(stamp)
                bars.append({"t": stamp, "o": open_, "h": high, "l": low, "c": close, "r": "N",
                             "tick_volume": tick_volume, "spread": spread})
            # `maxbars` is a local terminal chart setting. It is useful for
            # diagnosing a truncated range, but it does not prove that the
            # broker retains the requested interval. Keep the two signals
            # separate so callers can tell the user which setting to change.
            terminal_limit = bool(max_bars and requested_bars > max_bars and raw_count <= max_bars)
            history_limit = "TERMINAL_MAX_BARS" if terminal_limit else ("BROKER_RETENTION" if not bars else None)
            provenance = {"timeframe": tf,
                          "symbol": canonical,
                          "closed_bar_provenance": HISTORY_CLOSED_BAR_PROVENANCE, "forming_bar_included": False,
                          "requested_bars": requested_bars, "returned_bars": len(bars),
                          "coverage_ratio": round(min(1.0, len(bars) / requested_bars), 6),
                          "coverage_start": None, "coverage_end": None,
                          "coverage_status": "EMPTY", "latest_closed_bar_age_seconds": None,
                          "terminal_max_bars": max_bars,
                          "history_limit": history_limit, "server_timezone": self.server_timezone_name,
                          "timestamp_basis": "UTC"}
            if invalid:
                return {"ok": False, "reason": "INVALID_PRICE_OBSERVATION", "bars": [], "n": 0, "max_bars": max_bars, "source": "MT5_HISTORY", "contract_version": HISTORY_CONTRACT_VERSION, "broker_symbol": resolved["broker_symbol"], **provenance, **AUTHORITY}
            bars.sort(key=lambda bar: bar["t"])
            for i, bar in enumerate(bars):
                bar["i"] = i
            coverage_start = bars[0]["t"] if bars else None
            coverage_end = bars[-1]["t"] if bars else None
            # A range is complete only when observed bars touch both requested
            # boundaries.  Broker sessions/holidays commonly leave an
            # intentional boundary delay; exposing PARTIAL keeps that fact
            # visible to the caller instead of silently presenting a bounded
            # slice as the full requested interval.
            first_stamp = first.isoformat(timespec="seconds").replace("+00:00", "Z")
            coverage_status = "EMPTY"
            latest_closed_bar_age_seconds = None
            if bars:
                latest_ts = datetime.fromisoformat(coverage_end.replace("Z", "+00:00")).timestamp()
                latest_closed_bar_age_seconds = round(max(0.0, time.time() - (latest_ts + TF_MINUTES[tf] * 60)), 3)
                observed_end = latest_ts + TF_MINUTES[tf] * 60
                coverage_status = "COMPLETE" if coverage_start == first_stamp and observed_end >= last.timestamp() else "PARTIAL"
            provenance.update({"coverage_start": coverage_start, "coverage_end": coverage_end,
                               "coverage_status": coverage_status,
                               "latest_closed_bar_age_seconds": latest_closed_bar_age_seconds})
            result = {"ok": bool(bars), "reason": None if bars else "NO_MARKET_DATA", "bars": bars, "n": len(bars), "max_bars": max_bars, "symbol": canonical, "source": "MT5_HISTORY", "contract_version": HISTORY_CONTRACT_VERSION, "broker_symbol": resolved["broker_symbol"], **provenance, **AUTHORITY}
            if result["ok"] and tf == "M5" and self.account_identity:
                try:
                    self.closed_candle_store.upsert(self.account_identity[0], self.account_identity[1], result)
                except Exception:
                    # The database is a restart fallback. It cannot make a
                    # broker response invalid or change promotion authority.
                    pass
            return result



def create_app(service: TerminalService | None = None, token: str | None = None) -> FastAPI:
    terminal = service or TerminalService(server_timezone=os.environ.get("MFE_MT5_SERVER_TIMEZONE", "UTC"))
    shared_token = os.environ.get("MFE_BRIDGE_TOKEN", "") if token is None else token
    app = FastAPI(title="MFE Read-only MT5 Bridge", docs_url=None, redoc_url=None, openapi_url=None)
    active_streams = 0
    stream_limit = tick_stream_limit()
    demo = DemoExecution(terminal, enabled=os.environ.get("MFE_ENABLE_MANUAL_DEMO", "false").lower() == "true")
    automation = DemoAutomation(terminal, enabled=os.environ.get("MFE_ENABLE_CARD_DEMO", "false").lower() == "true")

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        host = request.url.hostname
        if host not in {"127.0.0.1", "localhost", "::1"} or request.headers.get("origin"):
            return JSONResponse({"error": "LOCAL_BRIDGE_ONLY"}, 403)
        try:
            length = int(request.headers.get("content-length", "0") or 0)
        except ValueError:
            return JSONResponse({"error": "INVALID_CONTENT_LENGTH"}, 400)
        if length > 16384:
            return JSONResponse({"error": "REQUEST_TOO_LARGE"}, 413)
        if request.url.path != "/health" and (not shared_token or not secrets.compare_digest(request.headers.get("x-mfe-bridge-token", ""), shared_token)):
            return JSONResponse({"error": "LOCAL_SESSION_REQUIRED"}, 403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_input(_request: Request, _error: RequestValidationError):
        return JSONResponse({"error": "INVALID_DEMO_INPUT" if _request.url.path.startswith("/mt5/demo/") else "INVALID_CONNECTION_INPUT"}, 422)

    @app.exception_handler(Exception)
    async def unavailable(_request: Request, _error: Exception):
        # Never serialize SDK exception strings or request bodies: they may include credentials.
        return JSONResponse({"error": "MT5_BRIDGE_REQUEST_FAILED"}, 503)

    @app.get("/health")
    def health():
        return {
            "ok": True,
            "service": "mfe-mt5-readonly",
            "schema": 1,
            "history_contract_version": HISTORY_CONTRACT_VERSION,
            "active_tick_streams": active_streams,
            "tick_stream_limit": stream_limit,
            **AUTHORITY,
        }

    @app.get("/mt5/status")
    @app.get("/mt5/account")
    def account():
        return terminal.account()

    @app.get("/mt5/demo/status")
    def demo_status():
        return demo.status()

    @app.post("/mt5/demo/auto/start")
    def auto_start(body: AutoStart):
        return automation.start(body)

    @app.get("/mt5/demo/auto/market")
    def auto_market(symbol: str = "XAUUSD", tf: str = "H1"):
        return automation.market(symbol, tf)

    @app.post("/mt5/demo/auto/heartbeat")
    def auto_heartbeat(body: dict):
        return automation.heartbeat(body.get("session_id", ""))

    @app.post("/mt5/demo/auto/execute")
    def auto_execute(body: AutoAction):
        return automation.execute(body)

    @app.post("/mt5/demo/auto/stop")
    def auto_stop():
        return automation.stop()

    @app.post("/mt5/demo/auto/reconcile")
    def auto_reconcile():
        return automation.reconcile()

    @app.get("/mt5/demo/positions")
    def demo_positions():
        return demo.positions()

    @app.get("/mt5/demo/deals")
    def demo_deals(symbol: str = "XAUUSD", start: str = Query(default="", alias="from"), end: str = Query(default="", alias="to"), limit: int = Query(default=500, ge=1, le=2000)):
        return read_demo_deals(terminal, symbol, start, end, limit)

    @app.post("/mt5/demo/preview")
    def demo_preview(body: DemoPreviewInput):
        return demo.preview(body)

    @app.post("/mt5/demo/submit")
    def demo_submit(body: DemoSubmitInput):
        return demo.submit(body)

    @app.get("/mt5/demo/receipt")
    def demo_receipt(request_id: str = Query(min_length=20, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")):
        return demo.receipt(request_id)

    @app.post("/mt5/connect")
    def connect(body: ConnectInput):
        return terminal.connect(body)

    @app.post("/mt5/disconnect")
    def disconnect():
        return terminal.disconnect()

    @app.get("/mt5/symbols")
    def symbols(symbol: str = "XAUUSD"):
        return terminal.resolve(symbol)

    @app.post("/mt5/resolve")
    def resolve_symbol(body: SymbolInput):
        return terminal.resolve(body.symbol, body.broker_symbol)

    @app.get("/mt5/bars")
    def bars(symbol: str = "XAUUSD", tf: str = "H1", n: int = 600, refresh: str = ""):
        # Focused M5 refreshes carry a per-request nonce so a just-closed
        # candle cannot be hidden by the bridge's short-lived rates cache.
        return terminal.rates(symbol, tf, n, use_cache=not bool(refresh))

    @app.get("/mt5/bar")
    def bar(symbol: str = "XAUUSD", tf: str = "M1"):
        return terminal.bar(symbol, tf)

    @app.get("/mt5/live_bundle")
    def bundle(symbol: str = "XAUUSD", tf: str = "H1", n: int = 600):
        return terminal.bundle(symbol, tf, n)

    @app.get("/mt5/stream")
    async def stream(request: Request, symbol: str = "XAUUSD", tf: str = "H1", cursor: str = ""):
        nonlocal active_streams
        if tf not in TF_MINUTES or not re.fullmatch(r"[A-Za-z0-9_.#-]{3,64}", symbol):
            return JSONResponse({"error": "INVALID_TICK_REQUEST"}, 400)
        initial = request.headers.get("last-event-id", cursor)
        if initial and not re.fullmatch(r"\d{1,12}:\d{1,16}:\d{1,8}", initial):
            return JSONResponse({"error": "INVALID_TICK_CURSOR"}, 400)
        if active_streams >= stream_limit:
            return JSONResponse({"error": "TICK_STREAM_LIMIT"}, 503)
        active_streams += 1
        async def events():
            nonlocal active_streams
            after = initial
            heartbeat = time.monotonic()
            try:
                yield "retry: 1000\n\n"
                while not await request.is_disconnected():
                    packet = await asyncio.to_thread(terminal.ticks, symbol, tf, after)
                    if not packet.get("ok"):
                        reset = packet.get("reason") == "TERMINAL_CHANGED"
                        yield f"event: {'reset' if reset else 'status'}\ndata: {json.dumps(packet)}\n\n"
                        if reset:
                            return
                        await asyncio.sleep(1)
                        continue
                    if packet["ticks"] or not after:
                        after = packet["cursor"]
                        yield f"id: {after}\nevent: tick\ndata: {json.dumps(packet)}\n\n"
                        heartbeat = time.monotonic()
                    elif time.monotonic() - heartbeat >= 5:
                        yield ": heartbeat\n\n"
                        heartbeat = time.monotonic()
                    await asyncio.sleep(0 if packet["catching_up"] else 0.1)
            finally:
                active_streams -= 1
        return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})

    @app.get("/mt5/symbol_spec")
    def spec(symbol: str = "XAUUSD"):
        return terminal.spec(symbol)

    @app.get("/mt5/history")
    def history(symbol: str = "XAUUSD", tf: str = "H1", start: str = Query(default="", alias="from"), end: str = Query(default="", alias="to")):
        return terminal.history(symbol, tf, start, end)

    @app.get("/mt5/advice")
    @app.get("/mt5/week_history")
    def not_measured():
        return {**NO_FORECAST_SOURCE, "reason": "NO_RESEARCH_SOURCE"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("MFE_BRIDGE_PORT", "8791"))
    uvicorn.run(app, host="127.0.0.1", port=port, access_log=False, log_level="critical")
