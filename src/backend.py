from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from src.bedrock_summarizer import process_document
from typing import List
from sqlalchemy import create_engine, Column, Integer, String, Text, Table, MetaData
from sqlalchemy.orm import sessionmaker
from fastapi.middleware.cors import CORSMiddleware

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
results_table = Table(
    "results", metadata,
    Column("id", Integer, primary_key=True),
    Column("filename", String),
    Column("summary", Text),
    Column("tags", Text),
)
metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

# Tag library (should be loaded from config/db in prod)
TAG_LIBRARY = [
    "Governance", "Covenants", "Conditions", "Restrictions", "Constitution", "Declaration", "Bylaws", "Rules", "Policies", "Code of Conduct", "Meetings", "Minutes", "AGM", "Communications", "Newsletters", "Marketing", "Social Media", "Website", "Finance", "Budgets", "Operating", "Annual", "Condo Specific", "Reserve Fund Study", "Owner Issues", "Property Management", "Maintenance", "Repairs", "Construction", "Inspections", "Landscaping", "Snow Removal", "Board Members Orientation & Onboarding", "Legal", "Lawsuits", "Contract Review", "Insurance"
]

@app.post("/process-document")
def process_document_api(file: UploadFile = File(...)):
    # Save uploaded PDF
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    pdf_path = os.path.join(upload_dir, file.filename)
    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    # Process document
    try:
        summary, tags = process_document(pdf_path, "data/converted_images", TAG_LIBRARY)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Store in SQLite
    session = SessionLocal()
    tags_str = ", ".join(tags)
    ins = results_table.insert().values(filename=file.filename, summary=summary, tags=tags_str)
    result = session.execute(ins)
    session.commit()
    session.close()
    return JSONResponse({
        "filename": file.filename,
        "summary": summary,
        "tags": tags
    })

@app.get("/documents")
def list_documents():
    session = SessionLocal()
    results = session.execute(results_table.select()).fetchall()
    session.close()
    docs = [
        {"id": row.id, "filename": row.filename, "summary": row.summary, "tags": row.tags.split(", ") if row.tags else []}
        for row in results
    ]
    return JSONResponse(docs)

@app.get("/documents/{doc_id}")
def get_document(doc_id: int):
    session = SessionLocal()
    result = session.execute(results_table.select().where(results_table.c.id == doc_id)).fetchone()
    session.close()
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = {"id": result.id, "filename": result.filename, "summary": result.summary, "tags": result.tags.split(", ") if result.tags else []}
    return JSONResponse(doc) 