# Architecture

## High-Level System Architecture (POC)

1. **Frontend (React + TypeScript)**
   - UI Features:
     - Document upload interface (uploads to FastAPI backend)
     - Left panel: List of uploaded documents
     - Right panel: Tag library (filtering), document summary display
   - Styling: Tailwind CSS, ShadUI components
   - API Communication: Communicates with backend via REST

2. **Backend (Python)**
   - API Server: FastAPI (async, modern Python APIs)
   - Database: SQLite (via SQLAlchemy)
   - Package Management: uv
   - Build System: hatchling
   - Code Quality: ruff, best practices, documentation, SRP
   - Document Processing Workflow:
     - Receive document upload from frontend
     - Save PDF locally
     - Convert PDF pages to JPEG images
     - Send all images to AWS Bedrock for summarization and tagging
     - Store results (tags, summary, metadata) in SQLite
   - Tag Management:
     - Maintain organizational tag library (with logic to avoid semantic duplication)
     - Allow new tags to be added if no existing tag fits

3. **Cloud Services**
   - AWS Bedrock: LLM for summarization and tagging

4. **Data Flow**
   - User uploads document → FastAPI
   - Backend processes document (PDF-to-image, Bedrock LLM)
   - Tags and summary stored in SQLite
   - Frontend fetches document list, tags, and summaries for display/filtering 