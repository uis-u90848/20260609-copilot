"""配信ルートの単体テスト。"""
import pytest

from pomodoro import create_app


@pytest.fixture
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def test_index_returns_200(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "ポモドーロタイマー" in response.get_data(as_text=True)


def test_index_returns_html(client):
    response = client.get("/")

    assert response.content_type.startswith("text/html")


def test_create_app_applies_config():
    app = create_app({"TESTING": True, "CUSTOM_KEY": "value"})

    assert app.config["TESTING"] is True
    assert app.config["CUSTOM_KEY"] == "value"


def test_create_app_without_config():
    app = create_app()

    assert app is not None


def test_unknown_path_returns_404(client):
    response = client.get("/does-not-exist")

    assert response.status_code == 404

