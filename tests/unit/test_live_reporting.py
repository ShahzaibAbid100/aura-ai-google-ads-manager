import sys
import types

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.entities import OAuthConnection
from app.services import analytics
from app.services.security import encrypt_tokens


def test_live_google_ads_report_uses_read_only_search_and_normalizes_metrics(monkeypatch):
    monkeypatch.setenv("GOOGLE_ADS_DEVELOPER_TOKEN", "test-developer-token")
    monkeypatch.setenv("GOOGLE_ADS_CUSTOMER_ID", "1234567890")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    from app.core.config import get_settings

    get_settings.cache_clear()
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(OAuthConnection(provider="google_ads", account_label="test", encrypted_tokens=encrypt_tokens({"refresh_token": "refresh", "access_token": "old"})))
        db.commit()

        monkeypatch.setattr(analytics, "refresh_google_access_token", lambda encrypted: ("access", encrypted))
        captured = {}

        class Metrics:
            impressions = 100
            clicks = 5
            cost_micros = 10_000_000
            conversions = 2.0
            conversions_value = 40.0

        class Row:
            metrics = Metrics()

        class Service:
            def search(self, customer_id, query):
                captured["customer_id"] = customer_id
                captured["query"] = query
                return [Row()]

        class Client:
            def get_service(self, name):
                assert name == "GoogleAdsService"
                return Service()

            @staticmethod
            def load_from_dict(configuration):
                captured["configuration"] = configuration
                return Client()

        google = types.ModuleType("google")
        ads = types.ModuleType("google.ads")
        googleads = types.ModuleType("google.ads.googleads")
        client_module = types.ModuleType("google.ads.googleads.client")
        client_module.GoogleAdsClient = Client
        monkeypatch.setitem(sys.modules, "google", google)
        monkeypatch.setitem(sys.modules, "google.ads", ads)
        monkeypatch.setitem(sys.modules, "google.ads.googleads", googleads)
        monkeypatch.setitem(sys.modules, "google.ads.googleads.client", client_module)

        report = analytics.get_live_google_ads_report(db)
        assert report["source"] == "google_ads_live"
        assert report["simulated"] is False
        assert report["metrics"]["ctr"] == 0.05
        assert report["metrics"]["average_cpc"] == 2.0
        assert report["metrics"]["cost_per_conversion"] == 5.0
        assert report["metrics"]["roas"] == 4.0
        assert "SELECT" in captured["query"]
        assert "MUTATE" not in captured["query"].upper()
        assert captured["configuration"]["developer_token"] == "test-developer-token"
    engine.dispose()
    get_settings.cache_clear()
