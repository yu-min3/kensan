"""
Dagster Resources: Iceberg Catalog と PostgreSQL DSN をラップ
"""

from dagster import ConfigurableResource

from catalog.config import get_catalog, get_pg_dsn


class IcebergCatalogResource(ConfigurableResource):
    """Nessie Iceberg REST Catalog リソース"""

    def get_catalog(self):
        return get_catalog()


class PostgresDsnResource(ConfigurableResource):
    """PostgreSQL 接続文字列リソース"""

    def get_dsn(self) -> str:
        return get_pg_dsn()
