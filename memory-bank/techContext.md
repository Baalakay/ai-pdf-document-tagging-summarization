# Technology Selection

## Backend
- Language: Python
- Framework: FastAPI
- Database: SQLite (SQLAlchemy ORM)
- Package Management: uv (pip is explicitly forbidden)
- Build System: hatchling
- Code Quality:
  - Linter/Formatter: ruff
  - Follow Python core best practices
  - Adhere to documentation standards
  - Apply single responsibility principle
- PDF Processing: PyMuPDF (fitz) for PDF-to-image conversion
- AI/LLM: AWS Bedrock (configurable LLM)
- Note: OCR/Textract is not used in the POC; only PDF-to-image conversion is performed.

## Frontend
- Framework: React
- Language: TypeScript
- Styling: Tailwind CSS
- Component Library: ShadUI 