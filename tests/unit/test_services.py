import socket

import pytest

from app.graph.workflows import build_copy_graph, planning_graph
from app.services.analytics import normalize_metrics, optimize
from app.services.campaigns import generate_ad_copy, validate_copy
from app.services.security import decrypt_tokens, encrypt_tokens, oauth_states
from app.services.website import validate_public_url


def test_private_and_local_urls_are_rejected(monkeypatch):
    with pytest.raises(ValueError):
        validate_public_url("http://127.0.0.1/admin")
    with pytest.raises(ValueError):
        validate_public_url("file:///etc/passwd")


def test_public_domain_resolves_to_public_address(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *args: [(None, None, None, None, ("93.184.216.34", 80))])
    assert validate_public_url("https://example.com") == "https://example.com"


def test_mock_ad_copy_has_google_limits_and_no_unverified_claims():
    result = generate_ad_copy("Garden Tools", ["Lightweight design"], [], 4)
    assert result["simulated"] is True
    assert all(len(item["text"]) <= 30 for item in result["headlines"])
    assert "guaranteed" not in str(result).lower()
    assert validate_copy(result) == []


def test_copy_graph_routes_without_unbounded_revisions():
    graph = build_copy_graph(max_revisions=1)
    result = graph.invoke({"request": {"product_name": "A product", "variations": 3}, "attempts": 0})
    assert result["attempts"] <= 1
    assert "issues" in result


def test_planner_marks_output_as_recommendation():
    result = planning_graph.invoke({"request": {"goal": "leads", "business_name": "Example", "daily_budget": 20}})["plan"]
    assert result["is_recommendation"] is True


def test_oauth_state_is_single_use_and_token_encryption_round_trips():
    state = oauth_states.create("verifier")
    assert oauth_states.consume(state) == "verifier"
    assert oauth_states.consume(state) is None
    encrypted = encrypt_tokens({"refresh_token": "secret"})
    assert "secret" not in encrypted
    assert decrypt_tokens(encrypted)["refresh_token"] == "secret"


def test_analytics_and_optimization_are_deterministic():
    metrics = normalize_metrics({"impressions": 100, "clicks": 5, "spend": 10, "conversions": 2, "conversion_value": 40})
    assert metrics["ctr"] == 0.05
    assert metrics["average_cpc"] == 2
    assert metrics["cost_per_conversion"] == 5
    assert metrics["roas"] == 4
    assert optimize(metrics)
