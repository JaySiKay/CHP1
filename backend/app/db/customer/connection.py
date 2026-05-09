from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.db.central.models import Store


def _build_url(user: str, password: str, host: str, port, db_name: str) -> str:
    return f"postgresql://{user}:{password}@{host}:{port}/{db_name}"


def get_remote_engine(store: Store) -> Engine:
    url = _build_url(
        user=store.db_user,
        password=store.db_password,
        host=store.db_host,
        port=store.db_port,
        db_name=store.db_name,
    )
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})


def test_connection(host: str, port: int, user: str, password: str, db_name: str) -> None:
    eng = create_engine(
        _build_url(user, password, host, port, db_name),
        connect_args={"connect_timeout": 5},
    )
    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
    finally:
        eng.dispose()
