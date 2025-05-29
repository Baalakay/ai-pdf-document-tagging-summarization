import os
import fitz  # PyMuPDF
from PIL import Image
import io
import boto3
import logging
from typing import List, Tuple
import json
import glob

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

def summarize_and_tag_with_claude(image_paths: List[str], tag_library: List[str], prompt: str = None) -> Tuple[str, List[str]]:
    if prompt is None:
        prompt = (
            "You are an expert document analyst. "
            "Given the following document (as images), do the following:\n"
            "1. Write a concise summary (2-5 sentences) of the document.\n"
            "2. Assign no more than three tags to the document, choosing from this tag library (avoid semantic duplication, prefer existing tags, only create new tags if necessary):\n"
            f"Tag Library: {', '.join(tag_library)}\n"
            "If you must create new tags, ensure each new tag is general (not overly specific) and does not overlap in meaning/entity with any other tag you create.\n"
            "If deciding between an existing domain-specific tag (e.g., 'Condo Specific', 'Bylaws', 'Reserve Fund Study') and a more general tag (e.g., 'Finance', 'Governance'), choose the existing domain-specific tag if it is relevant to the document.\n"
            "For example, for a condominium market report, good tags might be: 'Condo Specific', 'Market Trends', 'Demographics'.\n"
            "Avoid tags that are too specific (e.g., 'Toronto 2013 Condo Market Trends') or too general if a domain tag is available.\n"
            "Return your response as a JSON object with two fields: 'summary' (string) and 'tags' (list of strings)."
        )
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
            try:
                result = json.loads(c['text'])
                summary = result.get('summary', '')
                tags = result.get('tags', [])
                if isinstance(tags, str):
                    tags = [t.strip() for t in tags.split(',') if t.strip()]
                return summary, tags
            except Exception as e:
                logger.error(f"Failed to parse LLM response as JSON: {e}\nResponse: {c['text']}")
                # fallback: return the whole text as summary, empty tags
                return c['text'], []
    return "", []

def cleanup_previous_outputs(pdf_path: str, output_dir: str):
    base = os.path.splitext(os.path.basename(pdf_path))[0]
    # Remove JPEGs
    for f in glob.glob(os.path.join(output_dir, f"{base}_page*.jpg")):
        try:
            os.remove(f)
        except Exception as e:
            logger.warning(f"Failed to remove {f}: {e}")
    # Remove response.json if present
    resp_path = os.path.join(output_dir, f"{base}.response.json")
    if os.path.exists(resp_path):
        try:
            os.remove(resp_path)
        except Exception as e:
            logger.warning(f"Failed to remove {resp_path}: {e}")

def process_document(pdf_path: str, output_dir: str, tag_library: List[str], max_pages: int = 5) -> Tuple[str, List[str]]:
    cleanup_previous_outputs(pdf_path, output_dir)
    image_paths = pdf_to_jpegs(pdf_path, output_dir, max_pages=max_pages)
    summary, tags = summarize_and_tag_with_claude(image_paths, tag_library)
    return summary, tags 