# Architecture

## High-Level System Architecture

1. **Frontend (React + TypeScript)**
   - UI Features:
     - Document upload interface (uploads to S3)
     - Left panel: List of uploaded documents
     - Right panel: Tag library (filtering), document summary display
   - Styling: Tailwind CSS, ShadUI components
   - API Communication: Communicates with backend via REST or GraphQL

2. **Backend (Python)**
   - API Server: FastAPI (recommended for async, modern Python APIs)
   - Package Management: uv
   - Build System: hatchling
   - Code Quality: ruff, best practices, documentation, SRP
   - Document Processing Workflow:
     - Receive document upload metadata from frontend
     - Trigger S3 upload (direct from frontend or via signed URL)
     - On new document in S3:
       - Use Amazon Textract to extract text/images from PDFs/Word docs
       - Chunk images/pages as needed (<3.3 MB)
       - Aggregate extracted content for LLM
       - Call Claude 3.7 (AWS Bedrock) for summary and tag generation
       - Store results (tags, summary, metadata) in a database (e.g., DynamoDB, PostgreSQL, or SQLite for MVP)
   - Tag Management:
     - Maintain organizational tag library (with logic to avoid semantic duplication)
     - Allow new tags to be added if no existing tag fits

3. **Cloud Services**
   - S3: Document storage
   - Amazon Textract: OCR for scanned/hybrid documents
   - AWS Bedrock (Claude 3.7): LLM for summarization and tagging

4. **Data Flow**
   - User uploads document → S3
   - Backend processes document (Textract, LLM)
   - Tags and summary stored in DB
   - Frontend fetches document list, tags, and summaries for display/filtering 