"""
共通設定: Nessie Catalog接続、S3設定
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from pyiceberg.catalog import load_catalog

# .envファイルを読み込み
load_dotenv(Path(__file__).parent.parent / ".env")


def get_catalog():
    """Nessie Iceberg REST Catalog への接続を返す"""
    return load_catalog(
        "nessie",
        **{
            "type": "rest",
            "uri": os.environ.get("NESSIE_URI", "http://localhost:19120/iceberg/"),
            "s3.endpoint": os.environ.get("S3_ENDPOINT", "http://localhost:9000"),
            "s3.access-key-id": os.environ.get("S3_ACCESS_KEY", "kensan"),
            "s3.secret-access-key": os.environ.get("S3_SECRET_KEY", "kensan-minio"),
            "s3.path-style-access": "true",
            "s3.region": "us-east-1",
            "warehouse": f"s3://{os.environ.get('S3_BUCKET', 'kensan-lakehouse')}",
        },
    )


def get_pg_dsn() -> str:
    """PostgreSQL接続文字列を返す"""
    host = os.environ.get("PG_HOST", "localhost")
    port = os.environ.get("PG_PORT", "5432")
    user = os.environ.get("PG_USER", "kensan")
    password = os.environ.get("PG_PASSWORD", "kensan")
    database = os.environ.get("PG_DATABASE", "kensan")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"
