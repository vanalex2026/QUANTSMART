"""Isolated SDK fixtures. These are unit tests, never production fallback data."""
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
try:
    from fastapi.testclient import TestClient
    from bridge.closed_candle_store import ClosedCandleStore
    from bridge.mt5_bridge import ConnectInput, TerminalService, create_app, indicators, TF_MINUTES, tick_stream_limit
except ModuleNotFoundError as error:
    if error.name not in {"fastapi", "pydantic", "starlette", "httpx"}:
        raise
    raise unittest.SkipTest(f"optional bridge dependency unavailable: {error.name}")

TOKEN = "test-only-local-bridge-token"
SECRET = "TEST_PASSWORD_NOT_TO_BE_RETAINED"

class FakeSDK:
    ACCOUNT_TRADE_MODE_DEMO = 0
    ACCOUNT_TRADE_MODE_REAL = 2
    def __init__(self):
        self.initialized = False
        self.calls = []
        self.account = SimpleNamespace(login=12345678, server="Fixture-XM-MT5", company="Test fixture", trade_mode=2, balance=120.5, equity=119.25, currency="USD")
        self.available = ["GOLDmicro", "GOLD.i#", "GOLD", "XAUUSDm", "XAUUSD.pro", "EURUSD.a"]
    def __getattr__(self, name):
        if name.startswith('TIMEFRAME_'): return name
        raise AttributeError(name)
    def initialize(self, *args, **kwargs):
        self.calls.append((args, dict(kwargs)))
        self.initialized = True
        return True
    def shutdown(self): self.initialized = False
    def account_info(self): return self.account if self.initialized else None
    def terminal_info(self): return SimpleNamespace(connected=self.initialized, maxbars=100000)
    def symbols_get(self):
        return [SimpleNamespace(name=n, description="Gold" if n.startswith(('GOLD','XAU')) else "Euro", currency_base="XAU" if n.startswith(('GOLD','XAU')) else "EUR", currency_profit="USD", custom=False, expiration_time=0) for n in self.available]
    def symbol_select(self, name, visible):
        self.selected = (name, visible)
        return name in self.available and visible
    def symbol_info(self, name): return SimpleNamespace(digits=2, point=.01, trade_tick_size=.01, trade_tick_value=1, trade_contract_size=100, volume_min=.01, volume_step=.01, volume_max=100, swap_long=0, swap_short=0)
    def copy_rates_from_pos(self, name, frame, pos, count):
        # Closed, deterministic fixture prices, intentionally not actual market data.
        seconds = TF_MINUTES.get(frame.replace("TIMEFRAME_", ""), 1) * 60
        end = int(time.time()) // seconds * seconds - pos * seconds
        return [dict(time=end-(count-i-1)*seconds, open=100+i, high=102+i, low=99+i, close=101+i, tick_volume=10+i, spread=20) for i in range(count)]
    def copy_rates_range(self, name, frame, start, end): return self.copy_rates_from_pos(name,frame,1,10)

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.sdk=FakeSDK();self.service=TerminalService(self.sdk)
        self.client=TestClient(create_app(self.service, TOKEN), base_url="http://127.0.0.1")
        self.headers={"X-MFE-Bridge-Token":TOKEN}
    def request(self,method,path,**kwargs):return self.client.request(method,path,headers=self.headers,**kwargs)
    def attach(self):return self.request('POST','/mt5/connect',json={})
    def test_health_exposes_history_contract_version(self):
        health=self.client.get('/health').json()
        self.assertTrue(health['ok'])
        self.assertEqual(health['service'],'mfe-mt5-readonly')
        self.assertEqual(health['history_contract_version'],2)
        self.assertEqual(health['authority'],'SHADOW_ONLY')
        self.assertFalse(health['live_apply_allowed'])
        self.assertEqual(health['tick_stream_limit'], tick_stream_limit())

    def test_tick_stream_limit_is_configurable_but_bounded(self):
        with patch.dict(os.environ, {'MFE_MAX_TICK_STREAMS': '48'}):
            self.assertEqual(tick_stream_limit(), 48)
        with patch.dict(os.environ, {'MFE_MAX_TICK_STREAMS': '999'}):
            self.assertEqual(tick_stream_limit(), 64)
        with patch.dict(os.environ, {'MFE_MAX_TICK_STREAMS': 'invalid'}):
            self.assertEqual(tick_stream_limit(), 16)
    def test_auto_attach_has_no_credentials_and_reads_real_account(self):
        before=self.request('GET','/mt5/account').json();self.assertFalse(before['connected']);self.assertEqual(len(self.sdk.calls),0)
        response=self.attach().json();self.assertTrue(response['connected']);self.assertEqual(response['account_kind'],'REAL');self.assertFalse(response['trade_allowed'])
        self.assertEqual(self.sdk.calls[0],((),{'timeout':10000}));self.assertEqual(response['balance'],120.5);self.assertEqual(response['max_bars'],100000)
    def test_path_and_manual_credentials_are_ephemeral(self):
        with tempfile.TemporaryDirectory() as folder:
            terminal=Path(folder)/'terminal64.exe';terminal.touch()
            response=self.request('POST','/mt5/connect',json={'terminal_path':str(terminal),'login':'123','password':SECRET,'server':'Fixture-Server'}).json()
            self.assertTrue(response['connected']);self.assertEqual(self.sdk.calls[-1][0],(str(terminal),));self.assertEqual(self.sdk.calls[-1][1]['password'],SECRET)
            self.assertNotIn(SECRET,json.dumps(response));self.assertNotIn(SECRET,repr(self.service.__dict__))
    def test_no_password_echo_on_validation_or_sdk_error(self):
        response=self.request('POST','/mt5/connect',json={'login':'not-a-number','password':SECRET});self.assertEqual(response.status_code,422);self.assertNotIn(SECRET,response.text)
        def broken(**kwargs):raise RuntimeError(SECRET)
        self.sdk.initialize=broken;response=self.request('POST','/mt5/connect',json={'login':'123','password':SECRET,'server':'Fixture'});self.assertNotIn(SECRET,response.text);self.assertEqual(response.json()['reason'],'MT5_INITIALIZE_FAILED')

    def test_mt5_authorization_error_is_mapped_without_echoing_sdk_details(self):
        def denied(*args, **kwargs):
            self.sdk.calls.append((args, dict(kwargs)))
            self.sdk.last_error = lambda: (-6, "Terminal: Authorization failed (account details omitted)")
            return False
        self.sdk.initialize = denied
        response = self.attach().json()
        self.assertFalse(response['connected'])
        self.assertEqual(response['reason'], 'MT5_AUTHORIZATION_FAILED')
        self.assertNotIn('Authorization failed', json.dumps(response))
    def test_symbol_priority_and_manual_override(self):
        self.attach();result=self.request('GET','/mt5/symbols?symbol=XAUUSD').json();self.assertEqual(result['broker_symbol'],'GOLD');self.assertEqual(self.sdk.selected,('GOLD',True))
        manual=self.request('POST','/mt5/resolve',json={'symbol':'XAUUSD','broker_symbol':'XAUUSDm'}).json();self.assertEqual(manual['broker_symbol'],'XAUUSDm')
        self.assertEqual(self.request('GET','/mt5/bars?symbol=XAUUSD&tf=H1&n=100').json()['broker_symbol'],'XAUUSDm')
    def test_external_account_change_clears_mapping_and_generation(self):
        self.attach();self.service.resolve('XAUUSD','XAUUSDm');generation=self.service.generation
        self.sdk.account.login=87654321;self.sdk.account.server='Different-broker'
        self.service.account();self.assertGreater(self.service.generation,generation);self.assertEqual(self.service.overrides,{})
    def test_external_terminal_restart_drops_attachment_and_in_memory_cache(self):
        self.attach();self.service.resolve('XAUUSD','XAUUSDm')
        self.service.bundle('XAUUSD','H1',20)
        self.assertTrue(self.service.cache);self.assertTrue(self.service.overrides)
        generation=self.service.generation
        # Simulate the broker terminal being closed/restarted while the bridge
        # process remains alive. The next account poll must invalidate every
        # terminal-derived value before a later attach can reuse this service.
        self.sdk.initialized=False
        disconnected=self.service.account()
        self.assertFalse(disconnected['connected'])
        self.assertEqual(disconnected['reason'],'TERMINAL_DISCONNECTED')
        self.assertFalse(self.service.attached)
        self.assertIsNone(self.service.account_identity)
        self.assertFalse(self.service.cache)
        self.assertFalse(self.service.overrides)
        self.assertGreater(self.service.generation,generation)
        # A fresh attach gets a new generation and starts with no old cache.
        self.sdk.initialized=True
        reattached=self.service.account()
        self.assertFalse(reattached['connected'])
        self.assertEqual(reattached['reason'],'NOT_ATTACHED')
        self.assertTrue(self.service.connect(ConnectInput())['connected'])
        self.assertFalse(self.service.cache)

    def test_terminal_probe_exception_drops_namespace_and_cache(self):
        self.attach();self.service.resolve('XAUUSD','XAUUSDm')
        self.service.bundle('XAUUSD','H1',20)
        generation=self.service.generation
        original_account_info=self.sdk.account_info
        def restarting_terminal():
            raise RuntimeError('terminal restarting')
        self.sdk.account_info=restarting_terminal
        unavailable=self.service.account()
        self.assertFalse(unavailable['connected'])
        self.assertEqual(unavailable['reason'],'ACCOUNT_UNAVAILABLE')
        self.assertFalse(self.service.attached)
        self.assertIsNone(self.service.account_identity)
        self.assertFalse(self.service.cache)
        self.assertFalse(self.service.overrides)
        self.assertFalse(self.service.tick_symbols)
        self.assertGreater(unavailable['generation'],generation)
        # The SDK may recover after the terminal restart, but the old bridge
        # attachment must not silently become valid again; a fresh connect is
        # required before bars can be read.
        self.sdk.account_info=original_account_info
        self.sdk.initialized=True
        self.assertEqual(self.service.account()['reason'],'NOT_ATTACHED')
        self.assertFalse(self.service.rates('XAUUSD','H1',20)['ok'])

    def test_symbol_probe_restart_is_typed_and_invalidates_namespace(self):
        self.attach(); self.service.resolve('XAUUSD', 'XAUUSDm')
        self.service.rates('XAUUSD', 'H1', 2)
        generation = self.service.generation
        self.sdk.symbols_get = lambda: (_ for _ in ()).throw(RuntimeError('terminal restarting'))
        result = self.service.resolve('XAUUSD')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'], 'HISTORY_UNAVAILABLE')
        self.assertFalse(self.service.attached)
        self.assertFalse(self.service.cache)
        self.assertFalse(self.service.overrides)
        self.assertGreater(self.service.generation, generation)

    def test_symbol_select_restart_is_typed_and_invalidates_namespace(self):
        self.attach(); self.service.resolve('XAUUSD', 'XAUUSDm')
        self.service.rates('XAUUSD', 'H1', 2)
        generation = self.service.generation
        self.sdk.symbol_select = lambda *_args: (_ for _ in ()).throw(RuntimeError('terminal restarting'))
        result = self.service.resolve('XAUUSD', 'XAUUSDm')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'], 'HISTORY_UNAVAILABLE')
        self.assertFalse(self.service.attached)
        self.assertFalse(self.service.cache)
        self.assertFalse(self.service.overrides)
        self.assertGreater(self.service.generation, generation)
    def test_closed_bars_and_real_observations_disclose_no_forecast_source(self):
        self.attach();data=self.request('GET','/mt5/live_bundle?symbol=XAUUSD&tf=H1&n=100').json();self.assertTrue(data['ok']);self.assertEqual(len(data['bars']),100);self.assertIn('ema10',data['observations']['indicators']);self.assertFalse(data['advice']['ok']);self.assertEqual(data['advice']['reason'],'NO_ADVISORY_SOURCE');self.assertEqual(data['advice']['source'],'NONE');self.assertIn('descriptive closed-bar observations only',data['advice']['source_disclosure']);self.assertEqual(data['advice']['authority'],'SHADOW_ONLY');self.assertEqual(data['advice']['decision'],'NO_DECISION');self.assertEqual(data['observations']['indicator_lookback'],100)
        bad=self.request('GET','/mt5/bars?n=1000000').json();self.assertFalse(bad['ok']);self.assertEqual(bad['bars'],[])

    def test_advice_endpoint_discloses_missing_forecast_source_and_authority(self):
        response = self.request('GET', '/mt5/advice').json()
        self.assertFalse(response['ok'])
        self.assertEqual(response['reason'], 'NO_RESEARCH_SOURCE')
        self.assertEqual(response['source'], 'NONE')
        self.assertIn('No forecast source is connected', response['source_disclosure'])
        self.assertEqual(response['authority'], 'SHADOW_ONLY')
        self.assertEqual(response['decision'], 'NO_DECISION')
        self.assertFalse(response['live_apply_allowed'])

    def test_read_only_feed_contract_exposes_closed_bar_provenance_and_symbol_failure(self):
        self.attach()
        bars=self.request('GET','/mt5/bars?symbol=XAUUSD&tf=M15&n=2').json()
        self.assertTrue(bars['ok']);self.assertEqual(bars['source'],'MT5_CLOSED_BARS')
        self.assertEqual(bars['timestamp_basis'],'UTC');self.assertTrue(bars['read_only'])
        self.assertEqual(bars['authority'],'SHADOW_ONLY');self.assertFalse(bars['live_apply_allowed'])
        missing=self.request('GET','/mt5/bars?symbol=ZZZTEST&tf=M15&n=2').json()
        self.assertFalse(missing['ok']);self.assertEqual(missing['reason'],'SYMBOL_NOT_FOUND');self.assertEqual(missing['bars'],[])

    def test_closed_rates_report_freshness_and_short_cache_provenance_for_atlas_frames(self):
        # The live/rates path is also consumed as the small tail for the
        # multi-year tape. Every supported Atlas frame must identify whether
        # its result came from the bridge cache and how old its newest closed
        # candle is; the second call must not erase that provenance.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            end = int(time.time()) // step * step - step
            def rows(*_args, end=end, step=step):
                return [
                    dict(time=end - step, open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
                    dict(time=end, open=101, high=103, low=100, close=102, tick_volume=1, spread=1),
                ]
            self.sdk.copy_rates_from_pos = rows
            fresh = self.service.rates('XAUUSD', tf, 2, use_cache=False)
            self.assertTrue(fresh['ok'], tf)
            self.assertFalse(fresh['cache_hit'], tf)
            self.assertEqual(fresh['cache_age_seconds'], 0.0, tf)
            self.assertIsInstance(fresh['retrieved_at'], str, tf)
            self.assertIsInstance(fresh['latest_closed_bar_age_seconds'], float, tf)
            self.assertGreaterEqual(fresh['latest_closed_bar_age_seconds'], 0.0, tf)
            cached = self.service.rates('XAUUSD', tf, 2)
            self.assertTrue(cached['cache_hit'], tf)
            self.assertIsInstance(cached['cache_age_seconds'], float, tf)
            self.assertGreaterEqual(cached['cache_age_seconds'], 0.0, tf)
            self.assertIsInstance(cached['latest_closed_bar_age_seconds'], float, tf)
            self.assertEqual(cached['closed_bar_provenance'], 'MT5_CLOSED_BARS', tf)

    def test_bars_refresh_nonce_bypasses_short_cache_for_newest_closed_candle(self):
        self.attach()
        step = TF_MINUTES['M5'] * 60
        end = int(time.time()) // step * step - step
        calls = []
        newest = {'value': 101}

        def rows(*_args):
            calls.append(True)
            return [
                dict(time=end - step, open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
                dict(time=end, open=100, high=max(102, newest['value']), low=99, close=newest['value'], tick_volume=1, spread=1),
            ]

        self.sdk.copy_rates_from_pos = rows
        first = self.request('GET', '/mt5/bars?symbol=XAUUSD&tf=M5&n=2').json()
        self.assertTrue(first['ok'])
        newest['value'] = 202
        cached = self.request('GET', '/mt5/bars?symbol=XAUUSD&tf=M5&n=2').json()
        self.assertTrue(cached['cache_hit'])
        self.assertEqual(cached['bars'][-1]['c'], 101)
        refreshed = self.request('GET', '/mt5/bars?symbol=XAUUSD&tf=M5&n=2&refresh=clock-2').json()
        self.assertTrue(refreshed['ok'])
        self.assertFalse(refreshed['cache_hit'])
        self.assertEqual(refreshed['bars'][-1]['c'], 202)
        self.assertEqual(len(calls), 2)

    def test_closed_rates_reject_off_grid_atlas_timestamps_before_caching(self):
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            aligned = int(time.time()) // step * step - step
            self.sdk.copy_rates_from_pos = lambda *_args, aligned=aligned: [dict(
                time=aligned + 60, open=100, high=102, low=99, close=101, tick_volume=1, spread=1
            )]
            result = self.service.rates('XAUUSD', tf, 2, use_cache=False)
            self.assertFalse(result['ok'], tf)
            self.assertEqual(result['reason'], 'INVALID_PRICE_OBSERVATION', tf)
            self.assertFalse(result['cache_hit'], tf)
            self.assertFalse(any(key[2] == tf for key in self.service.cache), tf)

    def test_closed_rates_reject_future_dated_in_process_cache_entries(self):
        # A monotonic timestamp should normally never be in the future, but a
        # suspended process or an injected/test clock can make that happen.
        # Such an entry must be a cache miss; otherwise the bridge would keep
        # serving an unboundedly old closed-bar tail while reporting age zero.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            aligned = int(time.time()) // step * step - step
            first = [dict(time=aligned, open=100, high=102, low=99, close=101, tick_volume=1, spread=1)]
            second = [dict(time=aligned, open=200, high=202, low=199, close=201, tick_volume=1, spread=1)]
            self.sdk.copy_rates_from_pos = lambda *_args, rows=first: rows
            fresh = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertTrue(fresh['ok'], tf)
            key = next(key for key in self.service.cache if key[2] == tf)
            payload = self.service.cache[key][1]
            self.service.cache[key] = (time.monotonic() + 60, payload)
            self.sdk.copy_rates_from_pos = lambda *_args, rows=second: rows
            reread = self.service.rates('XAUUSD', tf, 1)
            self.assertTrue(reread['ok'], tf)
            self.assertFalse(reread['cache_hit'], tf)
            self.assertEqual(reread['bars'][0]['c'], 201, tf)

    def test_closed_rates_refetch_when_cache_provenance_is_tampered(self):
        # A cache hit must never turn an unmarked/forming payload into closed
        # history.  This covers all Pattern Atlas frames and keeps the bridge
        # fail-closed if a process upgrade leaves a pre-provenance entry in
        # memory or a test/integration hook mutates the payload.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            aligned = int(time.time()) // step * step - step
            first = [dict(time=aligned, open=100, high=102, low=99, close=101, tick_volume=1, spread=1)]
            second = [dict(time=aligned, open=200, high=202, low=199, close=201, tick_volume=1, spread=1)]
            self.sdk.copy_rates_from_pos = lambda *_args, rows=first: rows
            fresh = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertTrue(fresh['ok'], tf)
            key = next(key for key in self.service.cache if key[2] == tf)
            corrupted = dict(self.service.cache[key][1])
            corrupted.pop('closed_bar_provenance', None)
            self.service.cache[key] = (time.monotonic(), corrupted)
            self.sdk.copy_rates_from_pos = lambda *_args, rows=second: rows
            reread = self.service.rates('XAUUSD', tf, 1)
            self.assertTrue(reread['ok'], tf)
            self.assertFalse(reread['cache_hit'], tf)
            self.assertEqual(reread['bars'][0]['c'], 201, tf)
            self.assertEqual(reread['closed_bar_provenance'], 'MT5_CLOSED_BARS', tf)
            self.assertFalse(reread['forming_bar_included'], tf)

    def test_closed_rates_refetch_when_cache_timezone_provenance_is_tampered(self):
        # The bridge's broker clock is part of the closed-bar contract. A
        # payload decoded with a different timezone must never be served from
        # the short-lived cache as if it were the current Exness tape.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            aligned = int(time.time()) // step * step - step
            first = [dict(time=aligned, open=100, high=102, low=99, close=101, tick_volume=1, spread=1)]
            second = [dict(time=aligned, open=200, high=202, low=199, close=201, tick_volume=1, spread=1)]
            self.sdk.copy_rates_from_pos = lambda *_args, rows=first: rows
            fresh = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertTrue(fresh['ok'], tf)
            key = next(key for key in self.service.cache if key[2] == tf)
            corrupted = dict(self.service.cache[key][1])
            corrupted['server_timezone'] = 'Europe/London'
            self.service.cache[key] = (time.monotonic(), corrupted)
            self.sdk.copy_rates_from_pos = lambda *_args, rows=second: rows
            reread = self.service.rates('XAUUSD', tf, 1)
            self.assertTrue(reread['ok'], tf)
            self.assertFalse(reread['cache_hit'], tf)
            self.assertEqual(reread['bars'][0]['c'], 201, tf)
            self.assertEqual(reread['server_timezone'], 'UTC', tf)

    def test_closed_rates_do_not_cache_empty_tail(self):
        # A transient broker/retention gap must be retried immediately. Empty
        # responses carry the same read-only marker as valid bars, so caching
        # them would hide a newly closed candle during the short TTL.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            self.sdk.copy_rates_from_pos = lambda *_args: []
            empty = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertFalse(empty['ok'], tf)
            self.assertEqual(empty['reason'], 'NO_MARKET_DATA', tf)
            self.assertFalse(any(key[2] == tf for key in self.service.cache), tf)

    def test_closed_rates_evict_previous_tail_when_authoritative_read_is_empty(self):
        # A forced refresh must not leave a prior valid tail eligible for the
        # next cache-enabled read after the terminal reports no rows. This is
        # especially important at a just-closed bucket boundary, where serving
        # the old tail would make the feed look healthy while hiding new data.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            step = TF_MINUTES[tf] * 60
            aligned = int(time.time()) // step * step - step
            first = [dict(time=aligned, open=100, high=102, low=99, close=101, tick_volume=1, spread=1)]
            self.sdk.copy_rates_from_pos = lambda *_args, rows=first: rows
            seeded = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertTrue(seeded['ok'], tf)
            self.sdk.copy_rates_from_pos = lambda *_args: []
            empty = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertFalse(empty['ok'], tf)
            self.assertFalse(any(key[2] == tf for key in self.service.cache), tf)
            reread = self.service.rates('XAUUSD', tf, 1)
            self.assertFalse(reread['ok'], tf)

    def test_closed_rates_scalar_sdk_payload_fails_closed_without_cache(self):
        # A restarting/native SDK shim may return a scalar instead of an
        # iterable structured array.  Treat it as a typed observation failure
        # for every Atlas frame; never let the malformed response escape as a
        # bridge 503 or leave a prior closed-bar cache entry available.
        self.attach()
        for tf in ('M5', 'M15', 'M30', 'H1'):
            self.sdk.copy_rates_from_pos = lambda *_args: 7
            result = self.service.rates('XAUUSD', tf, 1, use_cache=False)
            self.assertFalse(result['ok'], tf)
            self.assertEqual(result['reason'], 'INVALID_PRICE_OBSERVATION', tf)
            self.assertEqual(result['bars'], [], tf)
            self.assertEqual(result['closed_bar_provenance'], 'MT5_CLOSED_BARS', tf)
            self.assertFalse(any(key[2] == tf for key in self.service.cache), tf)

    def test_closed_rates_reject_m1_without_touching_sdk_or_cache(self):
        # M1 remains valid for the forming-bar/tick diagnostics paths, but it
        # is outside the closed-bar research contract.  Reject it before
        # symbol resolution/SDK access so a direct caller cannot seed an M1
        # cache entry that later masquerades as Atlas history.
        self.attach()
        # Simulate a legacy process cache populated before the closed-frame
        # allowlist existed; the forbidden request must evict that namespace.
        self.service.cache[(self.service.generation, 'GOLD', 'M1', 2, False)] = (time.monotonic(), {'ok': True, 'bars': [{}]})
        calls = []
        original = self.sdk.copy_rates_from_pos
        def unexpected(*args):
            calls.append(args)
            return original(*args)
        self.sdk.copy_rates_from_pos = unexpected
        result = self.service.rates('XAUUSD', 'M1', 2, use_cache=False)
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'], 'UNSUPPORTED_HISTORY_TIMEFRAME')
        self.assertEqual(result['source'], 'MT5_CLOSED_BARS')
        self.assertEqual(result['closed_bar_provenance'], 'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertEqual(calls, [])
        self.assertFalse(self.service.cache)

    def test_closed_history_provenance_keeps_requested_timeframe_on_all_paths(self):
        """Saved Exness ranges/tails must remain attributable to their frame.

        The bridge returns a typed contract even when a frame is rejected or
        the terminal is unavailable.  Keep the requested timeframe in that
        contract so a retry/cache layer cannot accidentally relabel an M5,
        M15, M30, or H1 result (and M1 remains fail-closed).
        """
        self.attach()
        for tf in ("M5", "M15", "M30", "H1"):
            result = self.service.rates("XAUUSD", tf, 1, use_cache=False)
            self.assertEqual(result["timeframe"], tf)
            self.assertEqual(result["closed_bar_provenance"], "MT5_CLOSED_BARS")
            self.assertFalse(result["forming_bar_included"])
            rejected = self.service.history("XAUUSD", tf, "2026-01-15T10:00:00Z", "2026-01-15T11:00:00Z")
            self.assertEqual(rejected["timeframe"], tf)
            self.assertEqual(rejected["closed_bar_provenance"], "MT5_CLOSED_BARS")
            self.assertFalse(rejected["forming_bar_included"])

        # M1 remains outside saved closed history and must not touch the SDK.
        self.sdk.copy_rates_range = lambda *_args: self.fail("M1 history must not reach the SDK")
        m1 = self.service.history("XAUUSD", "M1", "2026-01-15T10:00:00Z", "2026-01-15T11:00:00Z")
        self.assertEqual(m1["timeframe"], "M1")
        self.assertEqual(m1["reason"], "UNSUPPORTED_HISTORY_TIMEFRAME")
        self.assertEqual(m1["closed_bar_provenance"], "MT5_CLOSED_BARS")

    def test_forming_m1_remains_available_for_live_diagnostics(self):
        # The closed-bar guard must not break the explicitly forming M1 bar
        # used by the live/tick diagnostics surface.
        self.attach()
        result = self.service.rates('XAUUSD', 'M1', 1, forming=True, use_cache=False)
        self.assertTrue(result['ok'])
        self.assertEqual(result['source'], 'MT5_FORMING_BAR')
        self.assertTrue(result['forming_bar_included'])

    def test_bar_error_and_invalid_bars_keep_read_only_provenance(self):
        self.attach()
        invalid=self.request('GET','/mt5/bars?symbol=XAUUSD&tf=BAD&n=2').json()
        self.assertFalse(invalid['ok']);self.assertEqual(invalid['source'],'MT5_CLOSED_BARS')
        self.assertEqual(invalid['closed_bar_provenance'],'MT5_CLOSED_BARS');self.assertFalse(invalid['forming_bar_included'])
        self.assertEqual(invalid['timestamp_basis'],'UTC');self.assertTrue(invalid['read_only'])
        forming=self.request('GET','/mt5/bar?symbol=ZZZTEST&tf=M15').json()
        self.assertIsNone(forming['bar']);self.assertEqual(forming['source'],'MT5_FORMING_BAR')
        self.assertTrue(forming['forming_bar_included']);self.assertEqual(forming['timestamp_basis'],'UTC');self.assertTrue(forming['read_only'])
    def test_observed_indicators_match_historical_recurrences(self):
        result=indicators([{"c":101,"h":103,"l":99},{"c":105,"h":106,"l":100},{"c":104,"h":108,"l":103}])
        self.assertAlmostEqual(result["atr14"],206/49);self.assertAlmostEqual(result["ema10"],12359/121)

    def test_configured_broker_clock_normalizes_winter_and_summer(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk, server_timezone='Europe/Athens')
        winter=int(datetime(2026,1,15,12,tzinfo=timezone.utc).timestamp())
        summer=int(datetime(2026,7,15,12,tzinfo=timezone.utc).timestamp())
        self.assertEqual(service.market_time(winter).isoformat(),'2026-01-15T10:00:00+00:00')
        self.assertEqual(service.market_time(summer).isoformat(),'2026-07-15T09:00:00+00:00')

    def test_invalid_server_timezone_fails_closed_without_crashing_bridge(self):
        # Environment/configuration typos must not make the bridge fail during
        # process startup or silently reinterpret broker-local epochs as UTC.
        service = TerminalService(self.sdk, server_timezone='Mars/Nowhere')
        self.assertFalse(service.server_timezone_valid)
        service.connect(ConnectInput())
        bars = service.rates('XAUUSD', 'H1', 2)
        self.assertFalse(bars['ok'])
        self.assertEqual(bars['reason'], 'INVALID_SERVER_TIMEZONE')
        self.assertEqual(bars['bars'], [])
        history = service.history('XAUUSD', 'H1', '2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z')
        self.assertFalse(history['ok'])
        self.assertEqual(history['reason'], 'INVALID_SERVER_TIMEZONE')
        self.assertEqual(history['source'], 'MT5_HISTORY')
        self.assertEqual(history['server_timezone'], 'Mars/Nowhere')

    def test_server_clock_does_not_drop_recent_closed_bars(self):
        from datetime import datetime, timezone
        from zoneinfo import ZoneInfo
        service=TerminalService(self.sdk, server_timezone='Europe/Athens')
        service.connect(ConnectInput())
        source=self.sdk.copy_rates_from_pos
        zone=ZoneInfo('Europe/Athens')
        def broker_bars(*args):
            bars=source(*args)
            for bar in bars:
                bar['time']=int(datetime.fromtimestamp(bar['time'],timezone.utc).astimezone(zone).replace(tzinfo=timezone.utc).timestamp())
            return bars
        self.sdk.copy_rates_from_pos=broker_bars
        data=service.rates('XAUUSD','H1',100)
        self.assertEqual(len(data['bars']),100)
        self.assertLessEqual(datetime.fromisoformat(data['bars'][-1]['t'].replace('Z','+00:00')).timestamp()+3600,time.time()+1)
        latest=service.bar('XAUUSD','M1')
        self.assertLess(abs(time.time()-datetime.fromisoformat(latest['time'].replace('Z','+00:00')).timestamp()),61)

    def test_history_enforces_requested_utc_window_and_closed_ohlc_contract(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        def rows(*_args):
            def epoch(hour): return int(datetime(2026,1,15,hour,tzinfo=timezone.utc).timestamp())
            return [
                dict(time=epoch(9), open=90, high=92, low=89, close=91, tick_volume=1, spread=1),
                dict(time=epoch(10), open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
                dict(time=epoch(11), open=110, high=112, low=109, close=111, tick_volume=1, spread=1),
            ]
        self.sdk.copy_rates_range=rows
        result=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertTrue(result['ok']);self.assertEqual(result['n'],1)
        self.assertEqual(result['contract_version'],2)
        self.assertEqual(result['server_timezone'],'UTC')
        self.assertEqual(result['timestamp_basis'],'UTC')
        self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertTrue(result['read_only'])
        self.assertEqual(result['max_bars'],100000)
        self.assertEqual(result['bars'][0]['t'],'2026-01-15T10:00:00Z')
        self.assertEqual(result['bars'][0]['i'],0)
        self.sdk.copy_rates_range=lambda *_args: [dict(time=int(datetime(2026,1,15,10,tzinfo=timezone.utc).timestamp()), open=100, high=99, low=98, close=101, tick_volume=1, spread=1)]
        invalid=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(invalid['ok']);self.assertEqual(invalid['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(invalid['bars'],[])

    def test_m5_history_persists_metadata_for_durable_tail_recovery(self):
        # History responses must retain the volume/spread fields required by
        # the durable store. Without them, the store validator rejects every
        # successful range write and restart recovery has no tail to serve.
        from datetime import datetime, timezone
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'bars.sqlite3'
            service = TerminalService(self.sdk)
            service.closed_candle_store = ClosedCandleStore(path)
            service._store_recovery_enabled = False
            service.connect(ConnectInput())
            stamp = lambda minute: int(datetime(2026, 1, 15, 10, minute, tzinfo=timezone.utc).timestamp())
            service.sdk.copy_rates_range = lambda *_args: [
                dict(time=stamp(0), open=100, high=102, low=99, close=101, tick_volume=7, spread=3),
                dict(time=stamp(5), open=101, high=103, low=100, close=102, tick_volume=8, spread=4),
            ]
            result = service.history('XAUUSD', 'M5', '2026-01-15T10:00:00Z', '2026-01-15T10:10:00Z')
            self.assertTrue(result['ok'])
            self.assertEqual(result['bars'][0]['tick_volume'], 7)
            self.assertEqual(result['bars'][1]['spread'], 4)
            stored = ClosedCandleStore(path).recent('12345678', 'Fixture-XM-MT5', result['broker_symbol'], 'UTC')
            self.assertEqual(len(stored), 2)
            self.assertEqual(stored[-1]['t'], '2026-01-15T10:05:00Z')
            self.assertEqual(stored[-1]['tick_volume'], 8)
            self.assertEqual(stored[-1]['spread'], 4)
            # Simulate a process restart after MT5 returns an empty tail. The
            # persisted M5 rows must be eligible for the scoped recovery path.
            os.utime(path, (0, 0))
            sdk2 = FakeSDK()
            service2 = TerminalService(sdk2)
            service2.closed_candle_store = ClosedCandleStore(path)
            service2._store_recovery_enabled = True
            service2.connect(ConnectInput())
            sdk2.copy_rates_from_pos = lambda *_args: []
            recovered = service2.rates('XAUUSD', 'M5', 2, use_cache=False)
            self.assertTrue(recovered['ok'])
            self.assertEqual(recovered['reason'], 'CLOSED_CANDLE_STORE_FALLBACK')
            self.assertEqual(recovered['bars'][-1]['t'], '2026-01-15T10:05:00Z')

    def test_history_exposes_bounded_coverage_ratio_for_atlas_frames(self):
        # A three-year fetch is assembled from bounded ranges. The bridge must
        # expose the rows/requested ratio for every supported Atlas timeframe,
        # including a typed malformed-row response, so callers can diagnose a
        # partial chunk without treating it as a successful empty tape.
        from datetime import datetime, timezone, timedelta
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        base=datetime(2026,1,15,10,tzinfo=timezone.utc)
        for tf in ('M5','M15','M30','H1'):
            step=timedelta(minutes=TF_MINUTES[tf])
            start=base;end=base + step * 2
            def rows(*_args, start=start, step=step):
                return [
                    dict(time=int((start + step * i).timestamp()), open=100+i, high=102+i, low=99+i, close=101+i, tick_volume=1, spread=1)
                    for i in range(2)
                ]
            self.sdk.copy_rates_range=rows
            result=service.history('XAUUSD',tf,start.isoformat().replace('+00:00','Z'),end.isoformat().replace('+00:00','Z'))
            self.assertTrue(result['ok'],tf)
            self.assertEqual(result['requested_bars'],2,tf)
            self.assertEqual(result['returned_bars'],2,tf)
            self.assertEqual(result['coverage_ratio'],1.0,tf)
            self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS',tf)
        self.sdk.copy_rates_range=lambda *_args: [dict(time=int(base.timestamp()), open=100, high=99, low=98, close=101, tick_volume=1, spread=1)]
        invalid=service.history('XAUUSD','M5',base.isoformat().replace('+00:00','Z'),(base+step*2).isoformat().replace('+00:00','Z'))
        self.assertFalse(invalid['ok'])
        self.assertEqual(invalid['coverage_ratio'],0.0)
        self.assertEqual(invalid['returned_bars'],0)

    def test_history_exposes_partial_range_boundaries_and_freshness(self):
        # A row ratio cannot explain where a bounded fetch is missing data.
        # Preserve the observed boundaries and an explicit status so a
        # three-year assembler can report a partial chunk without promoting it
        # to complete history.  Freshness is diagnostic only and must never
        # turn an old closed bar into live data.
        from datetime import datetime, timezone
        service = TerminalService(self.sdk); service.connect(ConnectInput())
        stamp = lambda hour: int(datetime(2026, 1, 15, hour, tzinfo=timezone.utc).timestamp())
        self.sdk.copy_rates_range = lambda *_args: [
            dict(time=stamp(11), open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
        ]
        partial = service.history('XAUUSD', 'H1', '2026-01-15T10:00:00Z', '2026-01-15T13:00:00Z')
        self.assertTrue(partial['ok'])
        self.assertEqual(partial['coverage_status'], 'PARTIAL')
        self.assertEqual(partial['coverage_start'], '2026-01-15T11:00:00Z')
        self.assertEqual(partial['coverage_end'], '2026-01-15T11:00:00Z')
        self.assertIsInstance(partial['latest_closed_bar_age_seconds'], float)
        self.assertGreaterEqual(partial['latest_closed_bar_age_seconds'], 0.0)

        self.sdk.copy_rates_range = lambda *_args: []
        empty = service.history('XAUUSD', 'H1', '2023-01-15T10:00:00Z', '2023-01-15T13:00:00Z')
        self.assertFalse(empty['ok'])
        self.assertEqual(empty['coverage_status'], 'EMPTY')
        self.assertIsNone(empty['coverage_start'])
        self.assertIsNone(empty['coverage_end'])
        self.assertIsNone(empty['latest_closed_bar_age_seconds'])

    def test_history_validation_errors_keep_versioned_provenance_contract(self):
        service=TerminalService(self.sdk)
        for result in (
            service.history('XAUUSD','BAD','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z'),
            service.history('XAUUSD','H1','not-a-time','2026-01-15T11:00:00Z'),
            service.history('ZZZTEST','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z'),
        ):
            self.assertFalse(result['ok'])
            self.assertEqual(result['source'],'MT5_HISTORY')
            self.assertEqual(result['contract_version'],2)
            self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')
            self.assertFalse(result['forming_bar_included'])
            self.assertEqual(result['timestamp_basis'],'UTC')
            self.assertTrue(result['read_only'])

    def test_history_rejects_non_string_direct_inputs_with_typed_contract(self):
        # HTTP validation normally gives the bridge strings, but local callers
        # and integration shims can invoke the service directly.  Unhashable
        # frames or non-string range bounds must fail closed instead of
        # escaping TypeError before the versioned provenance response exists.
        service = TerminalService(self.sdk)
        bad_frame = service.history('XAUUSD', [], '2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z')
        self.assertFalse(bad_frame['ok'])
        self.assertEqual(bad_frame['reason'], 'INVALID_TIMEFRAME')
        self.assertEqual(bad_frame['source'], 'MT5_HISTORY')
        self.assertEqual(bad_frame['contract_version'], 2)
        self.assertEqual(bad_frame['closed_bar_provenance'], 'MT5_CLOSED_BARS')
        bad_bounds = service.history('XAUUSD', 'H1', None, '2026-01-15T11:00:00Z')
        self.assertFalse(bad_bounds['ok'])
        self.assertEqual(bad_bounds['reason'], 'INVALID_OR_EXCESSIVE_HISTORY_WINDOW')
        self.assertEqual(bad_bounds['source'], 'MT5_HISTORY')
        self.assertEqual(bad_bounds['contract_version'], 2)
        self.assertEqual(bad_bounds['closed_bar_provenance'], 'MT5_CLOSED_BARS')

    def test_history_rejects_m1_before_sdk_range_request(self):
        # M1 remains available to live/rates diagnostics, but it is outside
        # the Pattern Atlas three-year closed-bar history contract.  Reject it
        # at the bridge boundary too, so direct API callers cannot bypass the
        # browser adapter's M5/M15/M30/H1 allowlist.
        self.attach()
        self.sdk.copy_rates_range = lambda *_args: self.fail('M1 history must not reach the SDK')
        result = self.service.history('XAUUSD', 'M1', '2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'], 'UNSUPPORTED_HISTORY_TIMEFRAME')
        self.assertEqual(result['source'], 'MT5_HISTORY')
        self.assertEqual(result['closed_bar_provenance'], 'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertEqual(result['timestamp_basis'], 'UTC')
        self.assertTrue(result['read_only'])

    def test_history_rejects_unaligned_broker_candle_timestamps_for_atlas_frames(self):
        # A row returned at 10:07 cannot be a valid closed M5/M15/M30/H1
        # candle. Reject it at the bridge boundary instead of allowing a
        # malformed chunk into the three-year adapter/cache.
        from datetime import datetime, timezone
        service = TerminalService(self.sdk); service.connect(ConnectInput())
        stamp = int(datetime(2026, 1, 15, 10, 7, tzinfo=timezone.utc).timestamp())
        self.sdk.copy_rates_range = lambda *_args: [
            dict(time=stamp, open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
        ]
        for tf in ('M5', 'M15', 'M30', 'H1'):
            result = service.history('XAUUSD', tf, '2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z')
            self.assertFalse(result['ok'], tf)
            self.assertEqual(result['reason'], 'INVALID_PRICE_OBSERVATION', tf)
            self.assertEqual(result['bars'], [], tf)
            self.assertEqual(result['closed_bar_provenance'], 'MT5_CLOSED_BARS', tf)

    def test_history_rejects_naive_request_timestamps_as_non_utc(self):
        # A naïve ISO string must never inherit the bridge host's local zone.
        # Otherwise the same restart request can query a different broker
        # interval on machines configured for different local timezones.
        service=TerminalService(self.sdk)
        result=service.history('XAUUSD','H1','2026-01-15T10:00:00','2026-01-15T11:00:00')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'],'HISTORY_TIMESTAMP_MUST_INCLUDE_TIMEZONE')
        self.assertEqual(result['source'],'MT5_HISTORY')
        self.assertEqual(result['timestamp_basis'],'UTC')
        self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')

    def test_history_sdk_restart_is_typed_and_never_cacheable(self):
        # A terminal restart can raise from copy_rates_range after account
        # discovery succeeded.  Preserve the history contract so the caller
        # retries as transport/unavailable data instead of receiving a 500
        # response that could be mistaken for an empty range.
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        # Seed terminal-derived state so the restart path must actively purge
        # it rather than merely returning a typed error.
        service.resolve('XAUUSD','XAUUSDm')
        service.rates('XAUUSD','H1',2)
        generation = service.generation
        def restarting(*_args):
            raise RuntimeError("terminal restarting")
        self.sdk.copy_rates_range=restarting
        result=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'],'HISTORY_UNAVAILABLE')
        self.assertEqual(result['bars'],[])
        self.assertEqual(result['source'],'MT5_HISTORY')
        self.assertEqual(result['contract_version'],2)
        self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertEqual(result['timestamp_basis'],'UTC')
        self.assertTrue(result['read_only'])
        self.assertFalse(service.attached)
        self.assertIsNone(service.account_identity)
        self.assertFalse(service.cache)
        self.assertFalse(service.overrides)
        self.assertGreater(service.generation, generation)

    def test_history_none_payload_with_disconnected_terminal_invalidates_session(self):
        # MT5 uses ``None`` for both an empty range and a lost terminal.  A
        # disconnected probe must be treated as transport failure so an old
        # account namespace cannot survive as reusable three-year history.
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        service.resolve('XAUUSD','XAUUSDm')
        service.rates('XAUUSD','H1',2)
        generation = service.generation
        def none_and_disconnect(*_args):
            # The session is still valid during resolve/account discovery;
            # the terminal disappears while the range call is in flight.
            self.sdk.terminal_info=lambda: SimpleNamespace(connected=False, maxbars=100000)
            return None
        self.sdk.copy_rates_range=none_and_disconnect
        result=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'],'HISTORY_UNAVAILABLE')
        self.assertEqual(result['bars'],[])
        self.assertEqual(result['source'],'MT5_HISTORY')
        self.assertEqual(result['contract_version'],2)
        self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertEqual(result['timestamp_basis'],'UTC')
        self.assertFalse(service.attached)
        self.assertFalse(service.cache)
        self.assertFalse(service.overrides)
        self.assertGreater(service.generation,generation)

    def test_history_never_promotes_rows_outside_requested_window(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        def epoch(value): return int(datetime.fromisoformat(value.replace('Z','+00:00')).timestamp())
        # Some terminals return the newest cached row when an older range is
        # unavailable. That row must be discarded instead of being presented
        # as historical evidence for the requested UTC interval.
        self.sdk.copy_rates_range=lambda *_args: [
            dict(time=epoch('2025-06-05T14:10:00Z'), open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
        ]
        result=service.history('XAUUSD','H1','2023-11-02T00:00:00Z','2023-11-03T00:00:00Z')
        self.assertFalse(result['ok']);self.assertEqual(result['reason'],'NO_MARKET_DATA');self.assertEqual(result['bars'],[])

    def test_closed_rates_sdk_restart_is_typed_and_invalidates_cache(self):
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        service.rates('XAUUSD','H1',2)
        generation = service.generation
        self.assertTrue(service.cache)
        self.sdk.copy_rates_from_pos=lambda *_args: (_ for _ in ()).throw(RuntimeError('terminal restarting'))
        result=service.rates('XAUUSD','H1',2, use_cache=False)
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'],'HISTORY_UNAVAILABLE')
        self.assertEqual(result['source'],'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertFalse(service.attached)
        self.assertFalse(service.cache)
        self.assertGreater(service.generation, generation)

    def test_closed_rates_none_payload_with_disconnected_terminal_invalidates_session(self):
        # MT5 can return None when the terminal disappears during a rates
        # request. This must be typed as transport failure and purge the old
        # account/cache namespace, rather than looking like ordinary missing
        # market data that remains reusable for the next closed-bar read.
        service = TerminalService(self.sdk); service.connect(ConnectInput())
        service.rates('XAUUSD', 'H1', 2)
        generation = service.generation

        def none_and_disconnect(*_args):
            self.sdk.initialized = False
            return None

        self.sdk.copy_rates_from_pos = none_and_disconnect
        result = service.rates('XAUUSD', 'H1', 2, use_cache=False)
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'], 'HISTORY_UNAVAILABLE')
        self.assertEqual(result['source'], 'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertFalse(service.attached)
        self.assertIsNone(service.account_identity)
        self.assertFalse(service.cache)
        self.assertGreater(service.generation, generation)

    def test_history_rejects_malformed_and_duplicate_rows_without_503(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        stamp=int(datetime(2026,1,15,10,tzinfo=timezone.utc).timestamp())
        # Missing OHLC fields and duplicate timestamps are source corruption,
        # not an empty interval. The bridge must fail closed with a stable data
        # error so a three-year shadow fetch cannot cache an ambiguous chunk.
        self.sdk.copy_rates_range=lambda *_args: [
            dict(time=stamp, open=100, high=102, low=99),
            dict(time=stamp, open=100, high=102, low=99, close=101),
        ]
        malformed=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(malformed['ok']);self.assertEqual(malformed['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(malformed['bars'],[])
        self.sdk.copy_rates_range=lambda *_args: [dict(time='not-a-timestamp', open=100, high=102, low=99, close=101)]
        bad_time=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(bad_time['ok']);self.assertEqual(bad_time['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(bad_time['bars'],[])

    def test_history_rejects_non_iterable_sdk_payload_without_503(self):
        # A terminal restart can leave the range API with a scalar payload
        # instead of a numpy row array. It must retain the typed, provenance
        # bearing history response so a three-year caller can fail closed.
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        self.sdk.copy_rates_range=lambda *_args: 42
        result=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertFalse(result['ok'])
        self.assertEqual(result['reason'],'INVALID_PRICE_OBSERVATION')
        self.assertEqual(result['bars'],[])
        self.assertEqual(result['source'],'MT5_HISTORY')
        self.assertEqual(result['contract_version'],2)
        self.assertEqual(result['closed_bar_provenance'],'MT5_CLOSED_BARS')
        self.assertFalse(result['forming_bar_included'])
        self.assertEqual(result['timestamp_basis'],'UTC')
        self.assertTrue(result['read_only'])

    def test_history_window_is_translated_to_configured_broker_clock(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk,server_timezone='Europe/Athens');service.connect(ConnectInput())
        windows=[]
        def capture(name,frame,start,end):windows.append((start,end));return []
        self.sdk.copy_rates_range=capture
        service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T11:00:00Z')
        self.assertEqual(windows[0],(datetime(2026,1,15,12,tzinfo=timezone.utc),datetime(2026,1,15,13,tzinfo=timezone.utc)))

    def test_history_reports_terminal_cap_separately_from_broker_retention(self):
        from datetime import datetime, timezone
        service=TerminalService(self.sdk);service.connect(ConnectInput())
        self.sdk.terminal_info=lambda: SimpleNamespace(connected=True, maxbars=2)
        stamp=lambda hour: int(datetime(2026,1,15,hour,tzinfo=timezone.utc).timestamp())
        self.sdk.copy_rates_range=lambda *_args: [
            dict(time=stamp(10), open=100, high=102, low=99, close=101, tick_volume=1, spread=1),
            dict(time=stamp(11), open=101, high=103, low=100, close=102, tick_volume=1, spread=1),
        ]
        terminal=service.history('XAUUSD','H1','2026-01-15T10:00:00Z','2026-01-15T14:00:00Z')
        self.assertEqual(terminal['history_limit'],'TERMINAL_MAX_BARS')
        self.assertEqual(terminal['terminal_max_bars'],2)
        self.assertEqual(terminal['closed_bar_provenance'],'MT5_CLOSED_BARS')
        self.sdk.terminal_info=lambda: SimpleNamespace(connected=True, maxbars=100000)
        self.sdk.copy_rates_range=lambda *_args: []
        retained=service.history('XAUUSD','H1','2023-01-15T10:00:00Z','2023-01-15T14:00:00Z')
        self.assertEqual(retained['history_limit'],'BROKER_RETENTION')
        self.assertEqual(retained['closed_bar_provenance'],'MT5_CLOSED_BARS')

    def test_live_mtf_cutoffs_do_not_outrun_the_main_closed_bar(self):
        from datetime import datetime
        self.attach();data=self.service.bundle('XAUUSD','H1',100)
        cutoff=datetime.fromisoformat(data['bars'][-1]['t'].replace('Z','+00:00')).timestamp()+3600
        for frame,row in data['observations_by_tf'].items():
            self.assertLessEqual(datetime.fromisoformat(row['as_of'].replace('Z','+00:00')).timestamp()+TF_MINUTES[frame]*60,cutoff)

    def test_invalid_prices_fail_closed(self):
        self.attach()
        self.sdk.copy_rates_from_pos=lambda *_args: [dict(time=int(time.time())-7200,open=float('nan'),high=2,low=1,close=1.5,tick_volume=1,spread=1)]
        data=self.service.rates('XAUUSD','H1',10);self.assertFalse(data['ok']);self.assertEqual(data['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(data['bars'],[]);self.assertEqual(data['source'],'MT5_CLOSED_BARS');self.assertEqual(data['closed_bar_provenance'],'MT5_CLOSED_BARS');self.assertFalse(data['forming_bar_included'])
        self.sdk.copy_rates_from_pos=lambda *_args: [dict(time=int(time.time())-7200,open=1,high=0,low=0.5,close=1.5,tick_volume=1,spread=1)]
        malformed_ohlc=self.service.rates('XAUUSD','H1',10);self.assertFalse(malformed_ohlc['ok']);self.assertEqual(malformed_ohlc['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(malformed_ohlc['bars'],[])
        self.sdk.copy_rates_from_pos=lambda *_args: [dict(time='not-a-timestamp',open=1,high=2,low=0.5,close=1.5,tick_volume=1,spread=1)]
        malformed_time=self.service.rates('XAUUSD','H1',10);self.assertFalse(malformed_time['ok']);self.assertEqual(malformed_time['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(malformed_time['bars'],[])
        self.sdk.copy_rates_from_pos=lambda *_args: [dict(time=int(time.time())-7200,open=1,high=2,low=0.5,close=1.5,tick_volume='bad',spread=1)]
        malformed_volume=self.service.rates('XAUUSD','H1',10);self.assertFalse(malformed_volume['ok']);self.assertEqual(malformed_volume['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(malformed_volume['bars'],[])
        stamp=int(time.time())-7200
        row=dict(time=stamp,open=1,high=2,low=0.5,close=1.5,tick_volume=1,spread=1)
        self.sdk.copy_rates_from_pos=lambda *_args: [row,dict(row)]
        duplicate=self.service.rates('XAUUSD','H1',10);self.assertFalse(duplicate['ok']);self.assertEqual(duplicate['reason'],'INVALID_PRICE_OBSERVATION');self.assertEqual(duplicate['bars'],[])

    def test_unsupported_platform_degrades(self):
        service=TerminalService(platform='linux');self.assertFalse(service.account()['supported']);self.assertFalse(service.connect(ConnectInput())['connected'])

    def test_tick_batch_preserves_ticks_with_identical_milliseconds(self):
        self.attach();now=int(time.time()*1000)
        rows=[dict(time=now//1000,time_msc=now,bid=100,ask=101,last=0,volume=0,flags=2),dict(time=now//1000,time_msc=now,bid=100.5,ask=101.5,last=0,volume=0,flags=2)]
        self.sdk.symbol_info_tick=lambda _name:SimpleNamespace(**rows[-1])
        self.sdk.copy_ticks_from=lambda *_args:rows
        self.sdk.COPY_TICKS_ALL=0
        first=self.service.ticks('XAUUSD','M1','');self.assertEqual(len(first['ticks']),2)
        self.assertEqual(self.service.ticks('XAUUSD','M1',first['cursor'])['ticks'],[])
        rows.append(dict(rows[-1],bid=100.6))
        next_frame=self.service.ticks('XAUUSD','M1',first['cursor']);self.assertEqual(len(next_frame['ticks']),1)
        self.assertEqual(next_frame['ticks'][0]['bid'],100.6)
        self.assertEqual(next_frame['bar']['tick_volume'],11)
        self.assertIsNotNone(next_frame['closed_bar'])

    def test_tick_payload_scalar_or_malformed_row_fails_closed(self):
        self.attach(); now=int(time.time())
        self.sdk.symbol_info_tick=lambda _:SimpleNamespace(time=now,time_msc=now*1000)
        self.sdk.COPY_TICKS_ALL=0
        self.sdk.copy_ticks_from=lambda *_:42
        scalar=self.service.ticks('XAUUSD','M1','')
        self.assertFalse(scalar['ok']);self.assertEqual(scalar['reason'],'INVALID_TICK_OBSERVATION')
        malformed=dict(time=now,time_msc=now*1000,bid=100,ask=101,last=0,volume='bad',flags=2)
        self.sdk.copy_ticks_from=lambda *_:[malformed]
        invalid=self.service.ticks('XAUUSD','M1','')
        self.assertFalse(invalid['ok']);self.assertEqual(invalid['reason'],'INVALID_TICK_OBSERVATION')

    def test_tick_payload_out_of_order_rows_fail_closed(self):
        self.attach(); now=int(time.time()*1000)
        self.sdk.symbol_info_tick=lambda _:SimpleNamespace(time=now//1000,time_msc=now)
        self.sdk.COPY_TICKS_ALL=0
        row=lambda stamp:dict(time=stamp//1000,time_msc=stamp,bid=100,ask=101,last=0,volume=0,flags=2)
        self.sdk.copy_ticks_from=lambda *_:[row(now),row(now-1)]
        result=self.service.ticks('XAUUSD','M1','')
        self.assertFalse(result['ok']);self.assertEqual(result['reason'],'INVALID_TICK_OBSERVATION')

    def test_tick_tail_scalar_or_duplicate_bars_fail_closed(self):
        self.attach(); now=int(time.time())
        tick=dict(time=now,time_msc=now*1000,bid=100,ask=101,last=0,volume=0,flags=2)
        self.sdk.symbol_info_tick=lambda _:SimpleNamespace(**tick)
        self.sdk.copy_ticks_from=lambda *_:[tick]
        self.sdk.COPY_TICKS_ALL=0
        self.sdk.copy_rates_from_pos=lambda *_:42
        scalar=self.service.ticks('XAUUSD','M1','')
        self.assertFalse(scalar['ok']);self.assertEqual(scalar['reason'],'INVALID_PRICE_OBSERVATION')
        bar=dict(time=now,open=100,high=102,low=99,close=101,tick_volume=1,spread=1)
        self.sdk.copy_rates_from_pos=lambda *_:[bar,dict(bar)]
        duplicate=self.service.ticks('XAUUSD','M1','')
        self.assertFalse(duplicate['ok']);self.assertEqual(duplicate['reason'],'INVALID_PRICE_OBSERVATION')

    def test_tick_batch_generation_resets_after_detach(self):
        self.attach();self.sdk.symbol_info_tick=lambda _:SimpleNamespace(time=int(time.time()),time_msc=int(time.time()*1000))
        self.sdk.copy_ticks_from=lambda *_:[];self.sdk.COPY_TICKS_ALL=0
        result=self.service.ticks('XAUUSD','M1',f'{self.service.generation-1}:1000:1')
        self.assertFalse(result['ok']);self.assertEqual(result['reason'],'TERMINAL_CHANGED')
        self.service.disconnect();self.assertFalse(self.service.ticks('XAUUSD','M1','')['ok'])

    def test_tick_tail_rejects_malformed_bar_metadata(self):
        self.attach();now=int(time.time())-7200
        self.sdk.symbol_info_tick=lambda _:SimpleNamespace(time=now,time_msc=now*1000)
        self.sdk.copy_ticks_from=lambda *_:[];self.sdk.COPY_TICKS_ALL=0
        self.sdk.copy_rates_from_pos=lambda *_: [dict(time='not-a-timestamp',open=1,high=2,low=0.5,close=1.5,tick_volume=1,spread=1)]
        bad_time=self.service.ticks('XAUUSD','M1','');self.assertFalse(bad_time['ok']);self.assertEqual(bad_time['reason'],'INVALID_PRICE_OBSERVATION')
        self.sdk.copy_rates_from_pos=lambda *_: [dict(time=now,open=1,high=2,low=0.5,close=1.5,tick_volume='bad',spread=1)]
        bad_volume=self.service.ticks('XAUUSD','M1','');self.assertFalse(bad_volume['ok']);self.assertEqual(bad_volume['reason'],'INVALID_PRICE_OBSERVATION')

    def test_tick_backlog_cannot_spin_without_cursor_progress(self):
        self.attach();now=int(time.time()*1000)
        row=dict(time=now//1000,time_msc=now,bid=100,ask=101,last=0,volume=0,flags=2)
        self.sdk.symbol_info_tick=lambda _:SimpleNamespace(**row)
        self.sdk.copy_ticks_from=lambda *_:[row]*8192;self.sdk.COPY_TICKS_ALL=0
        result=self.service.ticks('XAUUSD','M1',f'{self.service.generation}:{now}:8192')
        self.assertFalse(result['ok']);self.assertEqual(result['reason'],'TICK_BACKLOG_OVERFLOW')
    def test_auth_host_origin_and_execution_refusal(self):
        self.assertEqual(self.client.get('/mt5/account').status_code,403)
        self.assertEqual(self.client.get('/mt5/account',headers={**self.headers,'Origin':'https://attacker.invalid'}).status_code,403)
        for route in ['/mt5/demo_order','/mt5/close_position','/mt5/modify_position']:
            self.assertEqual(self.request('POST',route,json={}).status_code,404)
        self.assertEqual(self.client.get('/health',headers={'Host':'attacker.invalid'}).status_code,403)
        self.assertEqual(self.request('GET','/mt5/stream?symbol=XAUUSD&tf=M1&cursor=bad').status_code,400)
    def test_disconnect_never_leaves_cached_account_data(self):
        self.attach();self.service.bundle('XAUUSD','H1',100);self.assertTrue(self.service.cache)
        self.request('POST','/mt5/disconnect',json={});self.assertFalse(self.service.account()['connected']);self.assertFalse(self.service.cache)
        self.assertFalse(self.request('GET','/mt5/live_bundle').json()['ok'])

if __name__=='__main__':unittest.main()
