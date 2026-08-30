# PatientTriage.ai 🏥🤖

> **Accenture Innovation Challenge 2026** — Round 2, Track 2 Submission  
> **Team:** The AML Atelier (Ayansh Shankar Yadav, Mantra Jain, Lasya Siri G - IIT Kanpur)  

*Welcome to our public repository! This repository contains our complete, integrated MVP (React Frontend + FastAPI/SQLite Backend). Since the application runs on a local server environment, we have designed this README to give you a complete, exhaustive walkthrough of the product, its clinical logic, and its architecture without requiring you to run the code.*

---

## 🎥 Demonstration Video 
**(https://www.loom.com/share/ba42df8f7701410984d585856dbbd9a7)**

---

## 🚨 The Problem: The Hidden Costs of Triage
Emergency Departments (EDs) face unprecedented overcrowding. Overtriage costs minutes, but **undertriage costs lives**. 

Currently, roughly **32.2% of ESI encounters are mistriaged**, and one in three of the sickest patients are missed at the front door. When nurses are forced to make rapid, subjective assessments based on incomplete data—while simultaneously fighting fatigue and manual data entry—occult risks (like sepsis or impending cardiac events) hide in plain sight. 

## 💡 Our Solution: An Invisible Safety Net
**PatientTriage.ai** transforms the triage desk from a manual data-entry terminal into an intelligent ambient sensing environment. It fuses ambient voice capture, seamless EHR synchronization, and strict clinical guardrails to safely score and monitor patients.

**Our core philosophy:** *The machine recommends, the nurse decides.*

---

## 🛠️ Core Modules & Walkthrough

If you were to run the application, here is the exact workflow you would experience across our 8 integrated screens:

### 1. Ambient Intake (Zero-Click Data Entry)
Instead of typing, the system uses Edge-NLP to silently capture the nurse-patient conversation. 
* It automatically diarizes speech and extracts the **Chief Complaint**.
* It queries the hospital's database to append **Prior Medical History** (EHR Sync).
* *Result:* The nurse maintains eye contact with the patient, and the chart is populated automatically.

### 2. The Triage Queue & AI Scoring
Once intake is complete, the patient lands in the Triage Queue. Our hybrid scoring engine (Deterministic Rules + ML) calculates a recommended Emergency Severity Index (ESI) score (1-5).
* **The Undertriage Catcher:** The system looks for hidden risks. For example, in our prototype, a 60-year-old patient (**W. Jackson**) presents with a simple cough (seemingly ESI 4). However, the AI detects a fever and tachypnea, cross-references his history, flags him for **Sepsis Risk**, and escalates the recommendation to ESI 2.
* **Uncertainty Gates:** If data is missing (e.g., patient **D. Kim**, a geriatric patient with missing vitals), the system refuses to guess. It dims the AI recommendation and flags an "Uncertainty" warning, forcing manual review.

### 3. Triage Sign-off & The Golden Rule
When the nurse clicks to sign off on a patient, they must confirm or override the AI's ESI recommendation.
* **The Golden Rule:** Hard-coded at the API layer, the AI can escalate a patient's priority to ensure safety, but it **cannot** de-escalate or override a nurse's clinical judgment. *(See the code: `backend/app/engine/guardrails.py`)*
* Any override requires a logged reason (e.g., "Agree with AI - sepsis protocol").

### 4. Waiting Room Escalation
Triage doesn't end at the desk. The system continuously tracks patients waiting for beds. 
* If a patient waits past their safe time threshold, or if follow-up vitals deteriorate, a global alert is triggered, catching the patients who crash while waiting.

### 5. Surge Mode (MCI Response)
Designed for mass casualty incidents (MCIs) or extreme overcrowding. A single toggle by an Administrator automatically lowers the threshold for high-acuity categorization, collapsing ambiguous ESI 3s into ESI 2s to clear the room in strict acuity order.

---

## 🏗️ Architecture & Tech Stack

The architecture is built for **Edge Deployment**. To ensure absolute zero-latency and 100% HIPAA compliance, no Protected Health Information (PHI) ever leaves the hospital network to external cloud providers.

### 📄 Deep-Dive Documentation
For a complete breakdown of our system architecture—including **7 Mermaid diagrams** detailing our API map, Database ERD, ML pipeline, and specific hardware proposals (Beamforming Mics, thermal cameras)—please read our master specification document:
👉 **[Read PatientTriage_Documentation.md](./PatientTriage_Documentation.md)**

### Frontend (Client-Side)
* **Framework:** React 18, TypeScript, Vite
* **State Management:** Zustand (Implements an **Optimistic UI** pattern: actions update the screen instantly with zero lag, while syncing to the database in the background).
* **Styling:** Tailwind CSS (Custom Dark Mode specifically designed to reduce eye strain in low-light ED environments).

### Backend (Server-Side)
* **Framework:** Python 3.13, FastAPI (Asynchronous)
* **Database:** SQLite (ORM via SQLAlchemy) — *Production ready to swap to PostgreSQL by changing one connection string.*
* **Real-time:** WebSocket hub broadcasts changes to all connected nurse stations simultaneously.

---

## 🚀 How to Run the Prototype Locally

If you wish to evaluate the live codebase, the system is fully operational.

### 1. Start the Backend (FastAPI)
The backend uses an in-memory SQLite database that automatically seeds with demo patients and staff on startup.

```bash
cd backend
# Install dependencies
pip3 install -r requirements.txt
# Run the server
uvicorn app.main:app --port 8000 --reload
```
*API Documentation will be available at: `http://localhost:8000/docs`*

### 2. Start the Frontend (Vite/React)
Open a new terminal window:

```bash
cd triage-app
# Install dependencies
npm install
# Run the development server
npm run dev
```

### 3. View the App
Navigate to `http://localhost:5173` in your browser. A green dot in the top right header confirms the frontend is successfully connected to the backend API and WebSockets.

---
*Built with ❤️ for the Accenture Innovation Challenge 2026*
