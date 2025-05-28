import os
import fitz  # PyMuPDF
from PIL import Image
import io
import boto3
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

MAX_IMAGE_SIZE = 4.5 * 1024 * 1024  # 4.5 MB
MODEL_ID = "us.anthropic.claude-3-sonnet-20240229-v1:0"

bedrock_client = boto3.client(service_name="bedrock-runtime")

def pdf_to_jpegs(pdf_path: str, output_dir: str, jpeg_quality: int = 70, max_dim: int = 4096, max_pages: int = 5) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    image_paths = []
    for page_num in range(min(len(doc), max_pages)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        if max(img.size) > max_dim:
            scale = max_dim / max(img.size)
            new_size = tuple([int(x * scale) for x in img.size])
            img = img.resize(new_size, Image.LANCZOS)
        img_path = os.path.join(output_dir, f"{os.path.splitext(os.path.basename(pdf_path))[0]}_page{page_num+1}.jpg")
        img.save(img_path, format="JPEG", quality=jpeg_quality, optimize=True)
        image_paths.append(img_path)
    return image_paths

def summarize_with_claude(image_paths: List[str], prompt: str = "Please summarize the following document, considering all pages:") -> str:
    content = [{"text": prompt}]
    for img_path in image_paths:
        with open(img_path, "rb") as f:
            img_bytes = f.read()
        content.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": img_bytes}
            }
        })
    messages = [{"role": "user", "content": content}]
    response = bedrock_client.converse(modelId=MODEL_ID, messages=messages)
    output_message = response['output']['message']
    for c in output_message['content']:
        if 'text' in c:
            return c['text']
    return ""

def generate_tags_with_claude(summary: str, tag_library: List[str]) -> List[str]:
    prompt = (
        "Given the following summary, assign 2-3 tags from this tag library (avoid semantic duplication):\n"
        f"Tag Library: {', '.join(tag_library)}\n"
        f"Summary: {summary}\n"
        "Return only the tags as a comma-separated list."
    )
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = bedrock_client.converse(modelId=MODEL_ID, messages=messages)
    output_message = response['output']['message']
    for c in output_message['content']:
        if 'text' in c:
            tags = [t.strip() for t in c['text'].split(',') if t.strip()]
            # Remove semantic duplicates (simple deduplication for PoC)
            unique_tags = []
            for tag in tags:
                if not any(tag.lower() in ut.lower() or ut.lower() in tag.lower() for ut in unique_tags):
                    unique_tags.append(tag)
            return unique_tags
    return []

def process_document(pdf_path: str, output_dir: str, tag_library: List[str], max_pages: int = 5) -> Tuple[str, List[str]]:
    image_paths = pdf_to_jpegs(pdf_path, output_dir, max_pages=max_pages)
    summary = summarize_with_claude(image_paths)
    tags = generate_tags_with_claude(summary, tag_library)
    return summary, tags 