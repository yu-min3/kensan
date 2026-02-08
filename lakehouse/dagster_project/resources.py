"""
Dagster Resources: Iceberg Catalog, PostgreSQL DSN, Loki をラップ
"""

from dagster import ConfigurableResource

from catalog.config import get_catalog, get_pg_dsn


class IcebergCatalogResource(ConfigurableResource):
    """Polaris Iceberg REST Catalog リソース"""

    def get_catalog(self):
        return get_catalog()


class PostgresDsnResource(ConfigurableResource):
    """PostgreSQL 接続文字列リソース"""

    def get_dsn(self) -> str:
        return get_pg_dsn()


class LokiResource(ConfigurableResource):
    """Loki API リソース"""

    base_url: str = "http://localhost:3100"

    def get_base_url(self) -> str:
        return self.base_url
