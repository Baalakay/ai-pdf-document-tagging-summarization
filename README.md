## Backend Development Server

To run the FastAPI backend locally with Uvicorn:

```bash
uvicorn src.main:app --reload
```

- The `--reload` flag enables hot-reloading for development.
- By default, the server will be available at http://localhost:8000

Make sure your virtual environment is activated and dependencies are installed.