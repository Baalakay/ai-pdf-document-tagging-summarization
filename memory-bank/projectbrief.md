# Project Requirements: Document Tagging and Summary Application

## Objective
Automatically generate tags and summaries for uploaded documents.

## Key Details
- **Document Source:** Upload documents (PDFs) via the React frontend to the FastAPI backend.
- **Tagging Goal:** Generate 2–3 descriptive tags per document, prioritizing a provided organizational tag library.

## POC Workflow

### UI Features:
- Simple interface to upload documents via the React frontend.
- Left panel: List of uploaded documents.
- Right panel (top): Clickable organizational tag library for filtering documents.
- Right panel (bottom): Display document summary when a document is selected.

### Tag Library (for filtering and tagging):
Governance, Covenants, Conditions, and Restrictions, Constitution, Declaration, Bylaws, Rules, Policies, Code of Conduct, Meetings, Minutes, AGM, Communications, Newsletters, Marketing, Social Media, Website, Finance, Budgets, Operating, Annual, Condo Specific, Reserve Fund Study, Owner Issues, Property Management, Maintenance, Repairs, Construction, Inspections, Landscaping, Snow Removal, Board Members Orientation & Onboarding, Legal, Lawsuits, Contract Review, Insurance

### On Document Upload:
- FastAPI receives the PDF and saves it locally.
- Each page is extracted as a JPEG image chunk.
- All images are sent to AWS Bedrock for analysis as a single document.
- AI assigns the most relevant 2–3 tags from the provided list.
- If no existing tags fit, new, non-overlapping tags are created and added to the tag library (avoiding semantic duplication).
- A concise 2–5 sentence summary is generated for each document.
- Results are stored in SQLite.

### Tagging & Summarization Logic:
- Prefer existing tags; only create new tags if necessary.
- Prevent semantic overlap/duplication in new tags.
- Summarize document, then tag (or vice versa, as efficient).

### AI/LLM:
- Use AWS Bedrock for summarization and tagging (configurable LLM).
- All orchestration is handled by FastAPI. 