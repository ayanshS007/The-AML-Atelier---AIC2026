# PatientTriage.ai Backend — Build Walkthrough

## ✅ Status: Fully Operational

The backend is live at `http://127.0.0.1:8000` with auto-generated API docs at `http://127.0.0.1:8000/docs`.

---

## What Was Built

### 21 Python Files Across 7 Packages

```
backend/
├── requirements.txt
├── data/triage.db              ← SQLite database (auto-created)
└── app/
    ├── main.py                 ← FastAPI entry point + CORS + WebSocket
    ├── config/
    │   └── triage_config.py    ← All tunable clinical knobs
    ├── models/
    │   └── models.py           ← 8 SQLAlchemy ORM models
    ├── schemas/
    │   └── schemas.py          ← 20+ Pydantic v2 schemas
    ├── engine/
    │   ├── scorer.py           ← Python port of the scoring engine
    │   └── guardrails.py       ← "Never lower human acuity" enforcement
    ├── db/
    │   ├── database.py         ← Async SQLAlchemy engine + sessions
    │   └── seed.py             ← 7 patients + 16 staff seeder
    ├── api/
    │   ├── patients.py         ← CRUD + intake + scoring
    │   ├── decisions.py        ← Triage submission + audit logging
    │   ├── staff.py            ← Doctor assignment + status
    │   ├── audit.py            ← CQI log + override statistics
    │   └── system.py           ← Surge mode + re-score + KPIs
    └── ws/
        └── __init__.py         ← WebSocket broadcast hub
```

---

## API Endpoints — All Tested ✅

| Method | Endpoint | Purpose | Tested |
|--------|----------|---------|--------|
| `GET` | `/` | Health check | ✅ |
| `GET` | `/api/v1/patients` | List all patients (filter by `?stage=queue`) | ✅ 7 patients returned |
| `GET` | `/api/v1/patients/{id}` | Full patient chart with timeline | ✅ PT-2007 chart loaded |
| `POST` | `/api/v1/patients` | Create from intake (scores + broadcasts) | ✅ |
| `GET` | `/api/v1/patients/{id}/decision` | Get ML recommendation | ✅ |
| `POST` | `/api/v1/patients/{id}/triage` | Submit nurse ESI decision | ✅ Audit logged |
| `GET` | `/api/v1/staff` | List all 16 staff members | ✅ |
| `PATCH` | `/api/v1/staff/{id}` | Assign patient / update status | ✅ |
| `GET` | `/api/v1/audit` | Full audit log | ✅ |
| `GET` | `/api/v1/audit/stats` | Override rate statistics | ✅ |
| `GET` | `/api/v1/system/status` | Dashboard KPIs | ✅ 7 queue, 14 available |
| `POST` | `/api/v1/system/surge` | Toggle surge mode + rescore | ✅ |
| `POST` | `/api/v1/system/rescore` | Manual global rescore | ✅ |
| `WS` | `/ws` | Real-time multi-station sync | ✅ |

---

## Scoring Engine Verification

The Python scorer produces identical results to the TypeScript version:

| Patient | Chief Complaint | ESI | Flag | Key Risk |
|---------|----------------|-----|------|----------|
| R. Silva (61M) | SOB worse lying flat | **4** | none | SpO2 95 — just above threshold |
| T. Adeyemi (29F) | Lower abdominal pain | **4** | none | Standard presentation |
| M. Garcia (45F) | Dolor de cabeza fuerte | **3** | none | Pain 8/10 |
| O. Martinez (19M) | Burning when I pee | **4** | none | Low acuity, full vitals |
| D. Kim (75M) | Fell, hit head, blood thinners | **4** | uncertainty | Geriatric + 1 missing vital |
| A. Becker (26F) | Anxiety, chest tight | **2** | none | HR 125, RR 28 |
| W. Jackson (60M) | Coughing green stuff | **2** | **undertriage** | Fever 38.9 + tachypnea + weak voice → sepsis caught |

---

## How to Run

### Start Backend
```bash
cd backend
uvicorn app.main:app --port 8000 --reload
```

### Start Frontend (separate terminal)
```bash
cd triage-app
npm run dev
```

### Access
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Auto-generated Docs:** http://localhost:8000/docs
- **Database file:** `backend/data/triage.db`

---

## Key Architecture Decisions

1. **SQLite + Async** — Zero-config database. SQLAlchemy ORM makes it trivially swappable to PostgreSQL later by changing one connection string.

2. **Pluggable Scorer** — `score_patient()` is a pure function. Swap it for a scikit-learn model or local LLM by changing a single import.

3. **Server-Side Guardrails** — The golden rule ("never lower human-assigned acuity") is enforced in `guardrails.py` at the API layer, not just the UI. Even a malicious API call cannot violate it.

4. **WebSocket Hub** — Every mutation (new patient, triage, assignment, escalation) broadcasts to all connected nurse stations. Multiple browser tabs stay in sync.

5. **Immutable Audit Trail** — Every nurse decision is permanently logged with the AI recommendation, override reason, review latency, and model version. This is the CQI/liability protection layer.

---

## Next Step: Frontend Integration

The backend is fully functional and serving real data. The next step is to wire the React frontend to call these API endpoints instead of managing everything in Zustand's in-memory state. This involves:
1. Creating a thin `fetch` wrapper (`src/api/client.ts`)
2. Adding a WebSocket listener (`src/api/websocket.ts`)
3. Modifying `store.ts` to fetch from `/api/v1/*` instead of importing seed data
