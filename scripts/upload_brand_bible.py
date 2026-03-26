"""
One-time script to upload the brand bible to the Anthropic Files API.
Run once, then paste the printed file_id into .env.

Usage:
    python scripts/upload_brand_bible.py --file data/brand_bible.txt
"""

import argparse
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()


def upload(file_path: str) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    with open(file_path, "rb") as f:
        response = client.beta.files.upload(
            file=(os.path.basename(file_path), f, "text/plain"),
            betas=["files-api-2025-04-14"],
        )

    return response.id


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default="data/brand_bible.txt", help="Path to brand bible file")
    args = parser.parse_args()

    file_id = upload(args.file)
    print(f"\nUpload successful!")
    print(f"File ID: {file_id}")
    print(f"\nAdd this to your .env:")
    print(f"BRAND_BIBLE_FILE_ID={file_id}")
