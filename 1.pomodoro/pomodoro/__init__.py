"""ポモドーロタイマーアプリのアプリケーションファクトリ。"""
import os

from flask import Flask, render_template

# テンプレート・静的ファイルは 1.pomodoro/ 直下に置くため、パスを明示する。
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app(config=None):
    """Flask アプリを生成して返す。

    テスト時に設定を差し替えられるよう、設定は引数で受け取る。
    """
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "templates"),
        static_folder=os.path.join(BASE_DIR, "static"),
    )

    if config:
        app.config.update(config)

    @app.route("/")
    def index():
        return render_template("index.html")

    return app
