Project Requirements: Document Tagging and Summary Application
Objective
Automatically generate tags and summaries for uploaded documents.
Key Details
Document Source: Upload documents (PDFs, Word docs) to an S3 bucket.
Tagging Goal: Generate 2–3 descriptive tags per document, prioritizing a provided organizational tag library.
Proposed Workflow
UI Features:
Simple interface to upload documents to S3.
Left panel: List of uploaded documents.
Right panel (top): Clickable organizational tag library for filtering documents.
Right panel (bottom): Display document summary when a document is selected.
Tag Library (for filtering and tagging):
Governance, Covenants, Conditions, and Restrictions, Constitution, Declaration, Bylaws, Rules, Policies, Code of Conduct, Meetings, Minutes, AGM, Communications, Newsletters, Marketing, Social Media, Website, Finance, Budgets, Operating, Annual, Condo Specific, Reserve Fund Study, Owner Issues, Property Management, Maintenance, Repairs, Construction, Inspections, Landscaping, Snow Removal, Board Members Orientation & Onboarding, Legal, Lawsuits, Contract Review, Insurance
On Document Upload:
Extract each page as an image chunk (<3.3 MB).
Analyze all chunks to understand document context.
Use AI to assign the most relevant 2–3 tags from the provided list.
If no existing tags fit, create new, non-overlapping tags and add them to the tag library (avoid semantic duplication).
Generate a concise 2–5 sentence summary for each document.
Tagging & Summarization Logic:
Prefer existing tags; only create new tags if necessary.
Prevent semantic overlap/duplication in new tags.
Summarize document, then tag (or vice versa, as efficient).
AI/LLM:
Use Claude 3.7 via AWS Bedrock for summarization and tagging.
AWS credentials are pre-configured.