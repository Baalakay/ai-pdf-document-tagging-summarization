import logging
import boto3
from botocore.exceptions import ClientError
import os
import fitz  # PyMuPDF
from PIL import Image
import io

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

MAX_IMAGE_SIZE = 4.5 * 1024 * 1024  # 4.5 MB in bytes
OUTPUT_DIR = "data/converted_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def pdf_to_jpegs(pdf_path, output_dir, jpeg_quality=70, max_dim=4096):
    doc = fitz.open(pdf_path)
    image_paths = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        # Resize if needed
        if max(img.size) > max_dim:
            scale = max_dim / max(img.size)
            new_size = tuple([int(x * scale) for x in img.size])
            img = img.resize(new_size, Image.LANCZOS)
        # Compress to JPEG
        out_path = os.path.join(output_dir, f"{os.path.splitext(os.path.basename(pdf_path))[0]}_page{page_num+1}.jpg")
        quality = jpeg_quality
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        # Reduce quality if needed to fit size
        while buffer.tell() > MAX_IMAGE_SIZE and quality > 30:
            quality -= 10
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
        with open(out_path, "wb") as f:
            f.write(buffer.getvalue())
        image_paths.append(out_path)
        logger.info(f"Saved {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")
    return image_paths

def generate_message_with_images(bedrock_client, model_id, input_text, image_paths):
    """
    Sends a message to Claude with multiple images (one per page).
    """
    content = [{"text": input_text}]
    for img_path in image_paths:
        with open(img_path, "rb") as img_file:
            img_bytes = img_file.read()
        content.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": img_bytes}
            }
        })
    message = {"role": "user", "content": content}
    messages = [message]
    response = bedrock_client.converse(
        modelId=model_id,
        messages=messages
    )
    return response

def main():
    model_id = "us.anthropic.claude-3-sonnet-20240229-v1:0"
    input_text = "Please summarize the following document, considering all pages:"
    pdf_dir = "data/docs"
    try:
        bedrock_client = boto3.client(service_name="bedrock-runtime")
        for fname in os.listdir(pdf_dir):
            if not fname.lower().endswith(".pdf"):
                continue
            pdf_path = os.path.join(pdf_dir, fname)
            logger.info(f"Processing {pdf_path}")
            image_paths = pdf_to_jpegs(pdf_path, OUTPUT_DIR)
            if len(image_paths) > 5:
                logger.warning(f"{fname} has {len(image_paths)} pages. Only the first 5 will be sent to Claude.")
                image_paths = image_paths[:5]
            logger.info(f"Image files: {image_paths}")
            for img_path in image_paths:
                logger.info(f"{img_path}: {os.path.getsize(img_path)/1024:.1f} KB")
            response = generate_message_with_images(
                bedrock_client, model_id, input_text, image_paths)
            output_message = response['output']['message']
            print(f"\nResults for {fname}:")
            print(f"Role: {output_message['role']}")
            for content in output_message['content']:
                if 'text' in content:
                    print(f"Text: {content['text']}")
            token_usage = response['usage']
            print(f"Input tokens:  {token_usage['inputTokens']}")
            print(f"Output tokens:  {token_usage['outputTokens']}")
            print(f"Total tokens:  {token_usage['totalTokens']}")
            print(f"Stop reason: {response['stopReason']}")
    except ClientError as err:
        logger.error(f"ClientError: {err}")
    except Exception as e:
        logger.error(f"Exception: {e}")

if __name__ == "__main__":
    main() 