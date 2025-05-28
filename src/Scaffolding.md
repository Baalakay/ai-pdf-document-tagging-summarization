Step 4: Scaffolding
This step is about setting up the initial project structure, tools, and configuration for both backend and frontend, based on your requirements and technology choices.
Scaffolding Plan
1. Backend (Python)
Initialize a new Python project using uv for package management and hatchling for builds.
Set up code quality tools: ruff for linting/formatting.
Prepare a FastAPI (or similar) app for API endpoints.
Add scripts/utilities for PDF-to-image conversion and Bedrock API calls.
Organize code into clear modules (single responsibility principle).
2. Frontend (React + TypeScript)
Initialize a new React project (with Vite or Create React App).
Add Tailwind CSS and ShadUI for styling and components.
Scaffold the main UI layout: document upload, document list, tag library, summary display.
Set up API communication with the backend.
3. Shared/DevOps
Create a .gitignore and basic README.
Set up initial directory structure for src/, data/, and memory-bank/.
Ensure all configuration files (e.g., for uv, hatchling, ruff, Tailwind) are present.


Step 4A: Frontend Scaffolding Plan
1. Initialize Vite + React + TypeScript Project
Use Vite to scaffold a new React project with TypeScript.
2. Add Tailwind CSS
Install and configure Tailwind CSS for utility-first styling.
3. Add ShadUI
Install ShadUI component library for modern UI components.
4. Organize Project Structure
Prepare folders for components, pages, and API utilities.
5. Initial UI Layout
Scaffold the main layout:
Left: Document list
Right (top): Tag library (filterable)
Right (bottom): Document summary display
Upload button/input

[MODE: INITIALIZING]
Manual ShadUI setup is now in place, and the frontend scaffolding is complete:
Tailwind CSS is configured and active.
The main layout (document list, tag library, summary, upload) is scaffolded in React.
The Vite dev server is running in the background for live preview.
Next steps for frontend:
Integrate real document and tag data (from backend/API).
Add interactivity: document selection, tag filtering, upload handling.
Style and enhance with ShadUI components as needed.
Would you like to:
Continue with further frontend enhancements,
Or proceed to the next step: backend scaffolding?
Let me know your preference!

[MODE: INITIALIZING]
A ShadUI Button has been added to your App.tsx just below the upload input.
How to test:
Start your frontend dev server (cd frontend && npm run dev).
Open the app in your browser.
You should see a button labeled “ShadUI Test Button” styled according to ShadUI’s default theme (not a plain HTML button).
If the button appears styled and interactive, ShadUI is working correctly!
If you see an error or a plain button, it may indicate a missing dependency or import issue.
Would you like to proceed with this test, or need help troubleshooting if the button does not render as expected?

[MODE: INITIALIZING]
The ShadUI Button component is now implemented locally and the Vite dev server is running again.
Please refresh or visit http://localhost:5173/ in your browser.
You should now see the “ShadUI Test Button” rendered and styled correctly.
Let me know if the button appears as expected, or if you encounter any further issues!

What would you like to research next?
Here are some common research topics for this phase:
Best practices for file uploads from React to a Python backend (with S3 integration)
Secure and efficient S3 upload patterns (direct vs. presigned URLs)
How to trigger backend processing after upload (webhooks, polling, S3 events)
Integrating AWS Bedrock (Claude 3.7) with Python for PDF/image analysis
Tagging and summarization prompt engineering for Claude
UI/UX patterns for document management apps
Any other specific technology, workflow, or design question
Please specify your research question or area of interest, or let me know if you want recommendations for what to research next!