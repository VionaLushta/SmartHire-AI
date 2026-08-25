# Installation Guide

## Prerequisites

- Python 3.10 or newer.
- Node.js 18 or newer.
- PostgreSQL 14 or newer.
- npm.

## Backend Setup

1. Open the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment.

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy the environment template:

   ```bash
   copy .env.example .env
   ```

5. Configure `DATABASE_URL`, `SECRET_KEY`, SMTP settings, and upload folders.

6. Start the API:

   ```bash
   uvicorn app.main:app --reload
   ```

## Frontend Setup

1. Open the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   copy .env.example .env
   ```

4. Set `VITE_API_URL` to the backend base URL.

5. Start the frontend:

   ```bash
   npm run dev
   ```

## Verification

- Backend: `python -m pytest`
- Frontend: `npm run build`

## Local Access

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

