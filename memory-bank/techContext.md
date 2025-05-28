# Technology Selection

## Backend
- Language: Python
- Package Management: uv (pip is explicitly forbidden)
- Build System: hatchling
- Code Quality:
  - Linter/Formatter: ruff
  - Follow Python core best practices
  - Adhere to documentation standards
  - Apply single responsibility principle
- OCR Service: Amazon Textract (for extracting text from scanned/image-based and hybrid PDFs before LLM processing)
- AI/LLM: Claude 3.7 via AWS Bedrock

## Frontend
- Framework: React
- Language: TypeScript
- Styling: Tailwind CSS
- Component Library: ShadUI 