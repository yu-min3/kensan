"""Storage tools for Cloudflare R2 file operations."""

import logging
import mimetypes
import uuid
from datetime import datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from kensan_ai.tools.base import tool
from kensan_ai.config import get_settings
from kensan_ai.db.connection import get_connection

logger = logging.getLogger(__name__)


def _parse_uuid(value: str | None) -> UUID | None:
    """Parse a string to UUID, returning None if invalid or empty."""
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


class R2Client:
    """Client for Cloudflare R2 storage operations."""

    def __init__(self):
        """Initialize the R2 client."""
        settings = get_settings()
        self.endpoint = settings.r2_endpoint
        self.access_key = settings.r2_access_key
        self.secret_key = settings.r2_secret_key
        self.bucket = settings.r2_bucket
        self._client: Any = None

    def _get_client(self) -> Any:
        """Get or create the boto3 S3 client."""
        if self._client is None:
            try:
                import boto3
                self._client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                )
            except ImportError:
                raise ImportError(
                    "boto3 package is required for R2 storage. "
                    "Install with: pip install boto3"
                )
        return self._client

    def _generate_key(self, user_id: UUID, filename: str) -> str:
        """Generate a unique S3 key for the file."""
        timestamp = datetime.now(ZoneInfo("UTC")).strftime("%Y%m%d")
        unique_id = str(uuid.uuid4())[:8]
        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
        return f"users/{user_id}/{timestamp}/{unique_id}_{safe_filename}"

    def _get_public_url(self, key: str) -> str:
        """Get the public URL for an uploaded file."""
        # R2 public URL format depends on your configuration
        # This assumes a custom domain or R2's public access URL
        if self.endpoint:
            # Remove the S3 API endpoint portion and construct public URL
            base = self.endpoint.replace("/s3", "").replace("//", "//").rstrip("/")
            return f"{base}/{self.bucket}/{key}"
        return f"https://{self.bucket}.r2.cloudflarestorage.com/{key}"

    async def upload_file(
        self,
        user_id: UUID,
        filename: str,
        content: bytes,
        content_type: str | None = None,
    ) -> dict[str, str]:
        """Upload a file to R2.

        Args:
            user_id: The user's ID
            filename: Original filename
            content: File content as bytes
            content_type: MIME type (auto-detected if not provided)

        Returns:
            Dict with 'key' and 'url'
        """
        if not content_type:
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        key = self._generate_key(user_id, filename)
        client = self._get_client()

        client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )

        url = self._get_public_url(key)
        return {"key": key, "url": url}

    async def get_file(self, key: str) -> dict[str, Any]:
        """Get file metadata and URL from R2.

        Args:
            key: The S3 key of the file

        Returns:
            Dict with file metadata
        """
        client = self._get_client()

        response = client.head_object(Bucket=self.bucket, Key=key)

        return {
            "key": key,
            "url": self._get_public_url(key),
            "contentType": response.get("ContentType"),
            "contentLength": response.get("ContentLength"),
            "lastModified": response.get("LastModified").isoformat() if response.get("LastModified") else None,
        }

    async def delete_file(self, key: str) -> bool:
        """Delete a file from R2.

        Args:
            key: The S3 key of the file

        Returns:
            True if successful
        """
        client = self._get_client()
        client.delete_object(Bucket=self.bucket, Key=key)
        return True

    async def generate_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
        for_upload: bool = False,
    ) -> str:
        """Generate a presigned URL for direct access/upload.

        Args:
            key: The S3 key
            expires_in: URL expiration time in seconds (default: 1 hour)
            for_upload: If True, generate URL for PUT (upload), else GET (download)

        Returns:
            Presigned URL string
        """
        client = self._get_client()
        method = "put_object" if for_upload else "get_object"

        url = client.generate_presigned_url(
            method,
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        return url


# Global instance
_r2_client: R2Client | None = None


def get_r2_client() -> R2Client:
    """Get or create the global R2Client instance."""
    global _r2_client
    if _r2_client is None:
        _r2_client = R2Client()
    return _r2_client


@tool(
    name="upload_file",
    description="ファイルをR2ストレージにアップロードします。画像やドキュメントの保存に使用します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "filename": {
                "type": "string",
                "description": "ファイル名",
            },
            "content_base64": {
                "type": "string",
                "description": "Base64エンコードされたファイル内容",
            },
            "content_type": {
                "type": "string",
                "description": "MIMEタイプ (省略時は自動検出)",
            },
            "save_to_documents": {
                "type": "boolean",
                "description": "documentsテーブルにも保存するか (デフォルト: true)",
            },
        },
        "required": ["user_id", "filename", "content_base64"],
    },
)
async def upload_file(args: dict[str, Any]) -> dict[str, Any]:
    """Upload a file to R2 storage."""
    import base64

    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    filename = args.get("filename", "").strip()
    if not filename:
        return {"error": "Filename cannot be empty"}

    content_base64 = args.get("content_base64", "")
    if not content_base64:
        return {"error": "Content cannot be empty"}

    content_type = args.get("content_type")
    save_to_documents = args.get("save_to_documents", True)

    try:
        # Decode base64 content
        content = base64.b64decode(content_base64)

        # Upload to R2
        r2_client = get_r2_client()
        result = await r2_client.upload_file(
            user_id=user_id,
            filename=filename,
            content=content,
            content_type=content_type,
        )

        # Optionally save to documents table
        file_id = None
        if save_to_documents:
            async with get_connection() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO documents (user_id, name, content_type, file_url)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                    """,
                    user_id,
                    filename,
                    content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
                    result["url"],
                )
                file_id = str(row["id"])

        return {
            "success": True,
            "fileId": file_id,
            "url": result["url"],
            "key": result["key"],
        }

    except Exception as e:
        logger.error(f"File upload failed: {e}")
        return {"error": f"Upload failed: {str(e)}"}


@tool(
    name="get_file",
    description="R2ストレージからファイルのメタデータとURLを取得します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "file_id": {
                "type": "string",
                "description": "ファイルID (documentsテーブルのID)",
            },
        },
        "required": ["user_id", "file_id"],
    },
)
async def get_file(args: dict[str, Any]) -> dict[str, Any]:
    """Get file metadata and URL from R2 storage."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    file_id = _parse_uuid(args.get("file_id"))
    if not file_id:
        return {"error": "Invalid or missing file_id"}

    try:
        # Get file info from documents table
        async with get_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, name, content_type, file_url, created_at, updated_at
                FROM documents
                WHERE id = $1 AND user_id = $2
                """,
                file_id,
                user_id,
            )

            if not row:
                return {"error": "File not found"}

            return {
                "fileId": str(row["id"]),
                "name": row["name"],
                "contentType": row["content_type"],
                "url": row["file_url"],
                "createdAt": row["created_at"].isoformat(),
                "updatedAt": row["updated_at"].isoformat(),
            }

    except Exception as e:
        logger.error(f"Get file failed: {e}")
        return {"error": f"Failed to get file: {str(e)}"}


@tool(
    name="delete_file",
    description="R2ストレージからファイルを削除します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "file_id": {
                "type": "string",
                "description": "ファイルID (documentsテーブルのID)",
            },
        },
        "required": ["user_id", "file_id"],
    },
)
async def delete_file(args: dict[str, Any]) -> dict[str, Any]:
    """Delete a file from R2 storage."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    file_id = _parse_uuid(args.get("file_id"))
    if not file_id:
        return {"error": "Invalid or missing file_id"}

    try:
        async with get_connection() as conn:
            # Get file URL to extract key
            row = await conn.fetchrow(
                """
                SELECT file_url
                FROM documents
                WHERE id = $1 AND user_id = $2
                """,
                file_id,
                user_id,
            )

            if not row:
                return {"error": "File not found"}

            file_url = row["file_url"]

            # Delete from R2 if URL exists
            if file_url:
                try:
                    # Extract key from URL (last part after bucket name)
                    r2_client = get_r2_client()
                    # Simple extraction - assumes URL format: .../bucket/key
                    key = file_url.split(f"{r2_client.bucket}/")[-1]
                    await r2_client.delete_file(key)
                except Exception as e:
                    logger.warning(f"Failed to delete from R2: {e}")

            # Delete from documents table
            await conn.execute(
                """
                DELETE FROM documents
                WHERE id = $1 AND user_id = $2
                """,
                file_id,
                user_id,
            )

            return {"success": True, "fileId": str(file_id)}

    except Exception as e:
        logger.error(f"Delete file failed: {e}")
        return {"error": f"Failed to delete file: {str(e)}"}


@tool(
    name="get_upload_url",
    description="R2への直接アップロード用の署名付きURLを生成します。大きなファイルのアップロードに使用します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "filename": {
                "type": "string",
                "description": "ファイル名",
            },
            "content_type": {
                "type": "string",
                "description": "MIMEタイプ",
            },
            "expires_in": {
                "type": "integer",
                "description": "URLの有効期限（秒、デフォルト: 3600）",
            },
        },
        "required": ["user_id", "filename"],
    },
)
async def get_upload_url(args: dict[str, Any]) -> dict[str, Any]:
    """Generate a presigned URL for direct upload to R2."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    filename = args.get("filename", "").strip()
    if not filename:
        return {"error": "Filename cannot be empty"}

    content_type = args.get("content_type")
    expires_in = args.get("expires_in", 3600)

    try:
        r2_client = get_r2_client()
        key = r2_client._generate_key(user_id, filename)

        upload_url = await r2_client.generate_presigned_url(
            key=key,
            expires_in=expires_in,
            for_upload=True,
        )

        return {
            "uploadUrl": upload_url,
            "key": key,
            "expiresIn": expires_in,
            "contentType": content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
        }

    except Exception as e:
        logger.error(f"Generate upload URL failed: {e}")
        return {"error": f"Failed to generate upload URL: {str(e)}"}


# All storage tools for export
ALL_STORAGE_TOOLS = [
    upload_file,
    get_file,
    delete_file,
    get_upload_url,
]
