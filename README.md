# CareFlow AI

AI-assisted administrative workflow platform for Australian GP clinics.

> **Status: in development (Milestone 1 - backend foundation).**
> Uses fictional data only. AI output is always a draft that requires staff review.
> The full README is written at the deployment milestone.

## Run the backend (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit .env with your Atlas connection string
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/health and http://127.0.0.1:8000/docs.

## Run the frontend (Windows PowerShell)

Needs Node 20.19+ (check with `node --version`). Works on its own with fictional demo data; no backend required.

```powershell
cd frontend
npm install
copy .env.example .env      # optional
npm run dev
```

Open http://localhost:5173.

- `VITE_DATA_SOURCE=mock` (default): fictional data saved in your browser, rule-based demo AI, clearly labelled "Demo".
- `VITE_DATA_SOURCE=api`: uses the FastAPI backend at `VITE_API_BASE_URL`. The enquiry endpoints arrive in backend Milestone 2, so until then API mode shows an honest "cannot reach / not available" error and never fake data.

## Run the backend tests

```powershell
cd backend
pytest -v
```
