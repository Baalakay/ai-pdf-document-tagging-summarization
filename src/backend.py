from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from src.bedrock_summarizer import process_document
from typing import List
from sqlalchemy import create_engine, Column, Integer, String, Text, Table, MetaData, ForeignKey, select
from sqlalchemy.orm import sessionmaker
from fastapi.middleware.cors import CORSMiddleware
import boto3
import json

app = FastAPI()

# Add CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite setup
DATABASE_URL = "sqlite:///data/results.db"
os.makedirs("data", exist_ok=True)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
metadata = MetaData()

# New normalized tables
# Documents table
documents_table = Table(
    "documents", metadata,
    Column("id", Integer, primary_key=True),
    Column("filename", String, unique=True),
    Column("summary", Text),
)
# Tags table (add group column)
tags_table = Table(
    "tags", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, unique=True),
    Column("group", String),
)
# Document-Tags join table
document_tags_table = Table(
    "document_tags", metadata,
    Column("document_id", Integer, ForeignKey("documents.id")),
    Column("tag_id", Integer, ForeignKey("tags.id")),
)
metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

# S3 setup
S3_BUCKET = "innovativesol-boardspace"
S3_DOC_PREFIX = "documents/"
S3_TAGS_KEY = "tags/tag_groups.json"
s3_client = boto3.client("s3")

# Tag groups will be loaded from S3

def initialize_tags():
    """
    If the tags table is empty, load tag_groups.json from S3 and populate the tags table.
    """
    session = SessionLocal()
    try:
        # Check if tags table is empty
        count = session.execute(select(tags_table)).fetchone()
        if not count:
            try:
                # Download tag_groups.json from S3
                obj = s3_client.get_object(Bucket=S3_BUCKET, Key=S3_TAGS_KEY)
                tag_groups = json.loads(obj["Body"].read().decode("utf-8"))
            except Exception as e:
                print(f"Error loading tag_groups.json from S3: {e}")
                session.close()
                raise
            # Insert tags and group assignments
            for group in tag_groups:
                for tag in group["tags"]:
                    session.execute(tags_table.insert().values(name=tag, group=group["name"]))
            session.commit()
    finally:
        session.close()

initialize_tags()

@app.post("/process-document")
def process_document_api(file: UploadFile = File(...)):
    # Save uploaded PDF locally
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    pdf_path = os.path.join(upload_dir, file.filename)
    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    # Upload PDF to S3
    try:
        s3_client.upload_file(pdf_path, S3_BUCKET, S3_DOC_PREFIX + file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")
    # Process document
    try:
        # Load tag library from DB for processing
        session = SessionLocal()
        tag_rows = session.execute(select(tags_table.c.name)).fetchall()
        tag_library = [row.name for row in tag_rows]
        session.close()
        summary, tags = process_document(pdf_path, "data/converted_images", tag_library)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    session = SessionLocal()
    try:
        # Check if document exists
        sel_doc = select(documents_table).where(documents_table.c.filename == file.filename)
        doc_row = session.execute(sel_doc).fetchone()
        if doc_row:
            # Update summary
            upd = documents_table.update().where(documents_table.c.filename == file.filename).values(summary=summary)
            session.execute(upd)
            doc_id = doc_row.id
            # Remove old tag links
            session.execute(document_tags_table.delete().where(document_tags_table.c.document_id == doc_id))
        else:
            # Insert document
            ins_doc = documents_table.insert().values(filename=file.filename, summary=summary)
            result = session.execute(ins_doc)
            doc_id = result.inserted_primary_key[0]
        # Insert tags if not exist, get tag ids
        tag_ids = []
        for tag in tags:
            sel = select(tags_table.c.id).where(tags_table.c.name == tag)
            tag_row = session.execute(sel).fetchone()
            if tag_row:
                tag_id = tag_row.id
            else:
                ins_tag = tags_table.insert().values(name=tag)
                tag_id = session.execute(ins_tag).inserted_primary_key[0]
            tag_ids.append(tag_id)
        # Link document to tags
        for tag_id in tag_ids:
            session.execute(document_tags_table.insert().values(document_id=doc_id, tag_id=tag_id))
        session.commit()
    finally:
        session.close()
    return JSONResponse({
        "filename": file.filename,
        "summary": summary,
        "tags": tags
    })

@app.get("/documents")
def list_documents():
    session = SessionLocal()
    try:
        docs = session.execute(select(documents_table)).fetchall()
        doc_list = []
        for doc in docs:
            # Get tags for this doc
            tag_rows = session.execute(
                select(tags_table.c.name)
                .select_from(document_tags_table.join(tags_table))
                .where(document_tags_table.c.document_id == doc.id)
            ).fetchall()
            tag_names = [row.name for row in tag_rows]
            doc_list.append({
                "id": doc.id,
                "filename": doc.filename,
                "summary": doc.summary,
                "tags": tag_names
            })
        return JSONResponse(doc_list)
    finally:
        session.close()

@app.get("/documents/{doc_id}")
def get_document(doc_id: int):
    session = SessionLocal()
    try:
        doc = session.execute(select(documents_table).where(documents_table.c.id == doc_id)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        tag_rows = session.execute(
            select(tags_table.c.name)
            .select_from(document_tags_table.join(tags_table))
            .where(document_tags_table.c.document_id == doc.id)
        ).fetchall()
        tag_names = [row.name for row in tag_rows]
        return JSONResponse({
            "id": doc.id,
            "filename": doc.filename,
            "summary": doc.summary,
            "tags": tag_names
        })
    finally:
        session.close()

@app.get("/tags")
def get_tags():
    session = SessionLocal()
    try:
        # Get all tags and group by group name
        rows = session.execute(select(tags_table.c.name, tags_table.c.group)).fetchall()
        group_map = {}
        for row in rows:
            group_map.setdefault(row.group, []).append(row.name)
        # Preserve S3 order by reloading tag_groups.json
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key=S3_TAGS_KEY)
            tag_groups = json.loads(obj["Body"].read().decode("utf-8"))
        except Exception as e:
            print(f"Error loading tag_groups.json from S3: {e}")
            tag_groups = []
        groups = []
        for group in tag_groups:
            groups.append({
                "name": group["name"],
                "tags": group_map.get(group["name"], [])
            })
        return JSONResponse(groups)
    finally:
        session.close()

@app.get("/")
def root():
    return {"status": "ok", "message": "Document Tagging API is running"} 