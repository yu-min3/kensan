"""Lakehouse integration for kensan-ai.

Fire & forget writes to Iceberg Bronze tables via Nessie catalog.
"""

from kensan_ai.lakehouse.writer import LakehouseWriter, get_writer

__all__ = ["LakehouseWriter", "get_writer"]
