"""Fail-closed contract for manual demo execution receipts.

The bridge is a reviewed demo-only adapter. A broker response is never treated
as a confirmed fill unless its state and numeric identity fields are valid.
"""
from __future__ import annotations

import math
from typing import Any


AUTHORITY = "MANUAL_DEMO_ONLY"
UNAVAILABLE_REASONS = frozenset(
    {
        "REQUEST_NOT_FOUND",
        "BROKER_RESULT_UNKNOWN_CHECK_MT5",
        "BROKER_RESULT_INVALID_RECEIPT",
        "ACCOUNT_UNAVAILABLE",
        "CONNECT_MT5_FIRST",
        "DEMO_ACCOUNT_CHANGED",
        "DEMO_ACCOUNT_REQUIRED",
        "DEMO_PREVIEW_UNAVAILABLE",
        "POSITIONS_UNAVAILABLE",
        "QUOTE_UNAVAILABLE",
        "QUOTE_STALE",
    }
)
_STATES = frozenset({"preview", "sending", "filled", "partial", "accepted", "rejected", "unknown"})


def _finite_positive(value: Any) -> bool:
    try:
        return math.isfinite(float(value)) and float(value) > 0
    except (TypeError, ValueError):
        return False


def _positive_identifier(value: Any) -> bool:
    """Require an MT5 ticket/deal identifier that can identify a real result."""
    if not isinstance(value, str) or not value or not value.isdecimal():
        return False
    try:
        return int(value) > 0
    except ValueError:
        return False


def receipt_resolution(receipt: dict[str, Any]) -> str:
    """Return the stable resolution class used by consumers of a receipt."""
    state = receipt.get("state")
    if state in {"preview", "sending"}:
        return "PENDING"
    if state == "filled":
        return "CONFIRMED"
    if state == "partial":
        return "PARTIAL"
    if state == "accepted":
        return "ACCEPTED"
    if state == "rejected":
        return "REJECTED"
    if state == "unknown":
        return "UNAVAILABLE"
    raise ValueError("INVALID_RECEIPT_STATE")


def normalize_receipt(receipt: dict[str, Any]) -> dict[str, Any]:
    """Validate and annotate one bridge receipt, raising on contract failure."""
    if not isinstance(receipt, dict):
        raise ValueError("INVALID_RECEIPT")
    if (
        receipt.get("scope") != AUTHORITY
        or receipt.get("real_execution_allowed") is not False
        or receipt.get("live_apply_allowed") is not False
    ):
        raise ValueError("INVALID_RECEIPT_AUTHORITY")
    state = receipt.get("state")
    if state not in _STATES:
        raise ValueError("INVALID_RECEIPT_STATE")
    if state == "unknown":
        if receipt.get("ok") is not False or receipt.get("reason") not in UNAVAILABLE_REASONS:
            raise ValueError("UNKNOWN_RECEIPT_REASON")
    elif state == "rejected":
        if receipt.get("ok") is not False or not isinstance(receipt.get("reason"), str):
            raise ValueError("INVALID_REJECTED_RECEIPT")
    elif state in {"filled", "partial"}:
        if receipt.get("ok") is not True:
            raise ValueError("INVALID_FILLED_RECEIPT")
        if not all(
            (
                _positive_identifier(receipt.get("order")),
                _positive_identifier(receipt.get("deal")),
                _finite_positive(receipt.get("volume")),
                _finite_positive(receipt.get("price")),
            )
        ):
            raise ValueError("INVALID_FILLED_RECEIPT")
    elif state == "accepted":
        if receipt.get("ok") is not True or not _positive_identifier(receipt.get("order")):
            raise ValueError("INVALID_ACCEPTED_RECEIPT")
    else:
        if receipt.get("ok") is not True:
            raise ValueError("INVALID_PENDING_RECEIPT")
    return {**receipt, "execution_resolution": receipt_resolution(receipt)}


def unavailable_receipt(reason: str = "BROKER_RESULT_INVALID_RECEIPT") -> dict[str, Any]:
    """Build the only safe receipt for an untrusted or missing broker result."""
    if reason not in UNAVAILABLE_REASONS:
        reason = "BROKER_RESULT_INVALID_RECEIPT"
    return normalize_receipt(
        {
            "ok": False,
            "state": "unknown",
            "reason": reason,
            "scope": AUTHORITY,
            "real_execution_allowed": False,
            "live_apply_allowed": False,
        }
    )

