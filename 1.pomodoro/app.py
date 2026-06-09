"""開発用エントリポイント。

    python app.py

で開発サーバーを起動する。
"""
from pomodoro import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
