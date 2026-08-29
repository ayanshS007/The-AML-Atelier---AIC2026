# Build prompt for Google Antigravity — PatientTriage.ai (local prototype)

> **How to use this:** In Antigravity, drop `PatientTriage_ai_PRD_v2.md` (and your existing `styles.css` if you have it) into the workspace folder, then paste everything below the line into a new Agent Manager task. Run it in **agent-assisted** mode so you approve steps. Ask it to produce a **plan artifact first**, then build.

---

You are building a **fully local, runnable prototype** of **PatientTriage.ai**, an emergency-department triage *decision-support* tool. The one rule of the product is: **the machine recommends, the nurse decides.** If `PatientTriage_ai_PRD_v2.md` is present in this workspace, treat it as the source of truth and this prompt as the build-scoping layer on top of it.

## 0. Hard guardrails (do not violate)
- **Decision-support only, not a clinical device.** Every recommendation must be reviewable and overridable by the (simulated) nurse. The app must **never** let the system lower a human-assigned acuity — only raise.
- **100% local. No cloud, no paid/external APIs, no network calls at runtime.** No real patient data, no PHI. **All data is synthetic and shipped in the repo.**
- **No real ML training and no real audio/ASR.** The "model" is a deterministic, explainable scoring engine (Section 5). The "microphone" is a simulated capture from scripted transcripts (Section 6). Say so in the UI where relevant.
- Reserve **one clay/terracotta tone system-wide for exactly one meaning: an under-triage mismatch.** Nothing else in the UI may use it.

## 1. How to work (use Antigravity's strengths)
1. **Plan first.** Produce a task-list / plan artifact breaking the build into the milestones in Section 9. Wait for approval before large steps.
2. **Build incrementally**, one milestone at a time, keeping the app runnable (`npm run dev`) after each.
3. **Self-verify in the browser.** After each screen, spin up the dev server, open it, click through the flow, and capture screenshots / a short walkthrough as artifacts. Fix what's broken before moving on.
4. Keep **all tunable numbers in one config file** (`src/config/triageConfig.ts`) — thresholds, weights, age bands, surge triggers, wait-time targets. These are the "knobs."
5. Deliver a **README** with exact run instructions and a one-paragraph "what's real vs simulated" note.

## 2. Tech stack (local, simple, self-verifiable)
- **React + Vite + TypeScript**, **Tailwind CSS**. Single-page app, client-side only (no backend needed; use in-memory state + seed JSON). If you add a backend, keep it a tiny local Node/Express with no external calls.
- State: React hooks / a light store (Zustand or context). No database — seed data lives in `src/data/`.
- Charts: hand-built divs/SVG (the design is blueprint-style bars/sparklines) or a lightweight lib — but **no external runtime fetches**.
- Optional, only if trivially free and offline-capable: the browser's built-in **Web Speech API** for a live-dictation flavour on the intake screen. If used, extraction of structured fields still comes from the scripted data, not from real recognition. Everything must work with Web Speech **absent**.

## 3. Design language ("Industry" blueprint)
Match the product's existing look. If `styles.css` is in the workspace, reuse its CSS variables/tokens. Otherwise implement:
- Light technical ground (~`#f2f2f3`), near-black text, a single **steel-blue accent** (~`#5980a6`) with a 100–900 tonal ramp.
- **Barlow Condensed** headings over **Barlow** body (Google Fonts, self-hosted or `@import`).
- **Wireframe objects:** cards, figures, and the primary button are square-cornered, hairline-bordered, with small "+" registration marks at the four corners. Cards are transparent line drawings; the primary button is the one solid accent fill.
- **Acuity is encoded by fill weight on the accent ramp:** ESI 1 solid → ESI 5 outline.
- **The reserved clay tone** (~`#a8564a` / bg `#faf0ed`) appears only on under-triage flags.
- Themed interaction states; `:focus-visible` = 2px accent outline. Lucide icons at stroke-width 1.5.

## 4. Domain model (types in `src/types.ts`)
Patient encounter fields: `caseId`, `name`, `age`, `sex`, `arrivalMode` (`walk-in | ambulance | referral | police | unknown`), `arrivalTime`, `chiefComplaintVerbatim`, `vitals { hr, sbp, dbp, rr, spo2, tempC, pain? }` (any may be **missing**), `weightKg?` (pediatric), `priorHistory?` (null for zero-history), `prehospital?` (for ambulance: `serialVitals[]`, `ecg?`, `interventions[]`, `gcs?`, `mechanism?`, `preNotification?`), `captureSession?` (Section 6).
Derived/emitted: `RiskProfile`, `TriageFlag`, `Explanation`, `TriageDecision` (see PRD Section 7 for the contracts). **Missingness is a first-class value — never coerce a missing vital to a "normal" default.**

## 5. The scoring engine (`src/engine/`) — deterministic & explainable
This replaces the ML model. It must be pure, reproducible, and produce **separate calibrated-looking channels plus per-driver contributions** so the rationale and Catcher are demonstrable.

**5.1 Feature engineering** — from vitals compute: `shockIndex = hr/sbp`, `MAP = (sbp + 2·dbp)/3`, `pulsePressure`, fever flag, tachypnea flag; keep age continuous; keep a `missingness[]` list.
**5.2 Age-stratified thresholds** — pull vital cut-offs from `triageConfig` by band (pediatric / adult / geriatric; weight-aware where weight exists). A given HR/RR/temp maps to different risk by band.
**5.3 Risk channels** — compute independent 0–1 scores for: `criticalCare/deterioration`, `admissionLikely`, `sepsis`, `acs`, `stroke`. Use transparent weighted rules over the features + text signals + voice signals (Section 6). Each channel records **which inputs contributed and by how much** (signed weights) — this feeds the rationale bars.
**5.4 Surface acuity** — threshold the "how a rushed triage would score this" read into ESI 1–5 (mostly vitals + complaint severity).
**5.5 Undertriage Catcher** — if `surfaceAcuity ∈ {4,5}` **AND** `max(hidden risk channels) ≥ catchThreshold` → raise an **undertriage flag** with `reasonCodes` and `drivingChannels`. **Asymmetric: bias toward flagging.** Also raise a distinct **"can't rule out" uncertainty flag** when data is too sparse/low-confidence (missing key vitals, low capture confidence, incomplete syndrome screen).
**5.6 Confidence** — every recommendation carries a confidence value derived from missingness + capture confidence + distance to the acuity boundary. **No score renders without a confidence indicator.** Low confidence trips the uncertainty gate.
**5.7 Rationale** — expose top signed drivers (structured + text + voice), a plain one-line "why," a **counterfactual** ("what would drop this flag", e.g. SBP > X, RR ≤ 18, lactate < 2), and a "similar past cases" line (from a small synthetic lookup).
Provide example constants in `triageConfig` (e.g. shockIndex flag ≥ 0.9, RR sepsis cut ≥ 22, geriatric uncertainty-gate-on) and comment that they're tunable.

## 6. Arrival mode + simulated ambient capture
**6.1 Two doors, opposite skepticism.**
- **Walk-in:** sparse data, single vitals snapshot; run the Catcher aggressively; widen uncertainty; this is where enrichment matters.
- **Ambulance:** ingest `prehospital` serial vitals (**a trend**), interventions, ECG, GCS; show an **EMS inbound / pre-arrival** view (ETA + provisional acuity + syndrome pre-notification); on arrival show **handoff reconciliation** (paramedic read vs engine read, **flag disagreement either direction**). Don't let a reassuring handoff stop re-scoring.
**6.2 Simulated microphone.** Each patient carries a `captureSession` = a scripted `transcript` (array of `{speaker: 'responder'|'patient'|'family', text}`), a `verbatimComplaint`, extracted `history` (OPQRST/SAMPLE key-values), `voiceSignals[]` (e.g. `slurred_speech`, `sentence_dyspnea`, `confusion`, `drowsiness`, `none`), a detected `language`, and an `asrConfidence` 0–1. On the intake screen, a **capture panel "plays" the transcript** line-by-line and populates the verbatim complaint + auto-extracted history chips + voice-signal chips + a consent indicator. `voiceSignals` feed the engine's stroke/resp/sepsis channels as **supportive-only** inputs (never standalone), and low `asrConfidence` or `voiceSignals: silence` widens uncertainty. Label the panel clearly as a **simulated** capture.

## 7. Screens to build (React routes; priority order)
Build P1 first (the core demo), then P2.
**P1 (must-have):**
1. **Triage Queue** — priority-then-wait table; per-row arrival-mode chip, verbatim complaint, vitals-at-door, model rec (fill-weight acuity), one-line signal, wait; **KPI tiles** (in waiting room, median wait, **open undertriage flags** in clay, override rate); filters (All / Flagged / Unseen / Re-scored); **surge toggle**; "+ New arrival".
2. **Intake capture (mode-aware)** — arrival-mode selector reshapes the form; verbatim complaint; **the simulated capture panel** (Section 6.2); vitals tiles (some deliberately empty → **"missing, not normal"** panel with `unset` tags); **confidence chip**; completeness meter; "send with blanks allowed".
3. **Patient card / decision** — acuity radio set with the recommendation marked + **confidence chip** + syndrome strip; **override reason required if assigning below ESI 2 / below the recommendation**; "assign & pull forward" vs "assign & keep in queue"; the card's open-duration is timed and logged.
4. **Rationale detail** — **signed driver bars (SHAP-style)** for structured + text (highlight risk words in the verbatim complaint) + **voice-signal evidence**; counterfactual; confidence; similar-past-cases; narration limited to shown drivers.
5. **Escalation alert (modal)** — fires when a waiting patient is re-scored up; old→new acuity, deterioration delta, the vitals movement vs unchanged complaint; pull-forward + notify; **dismiss requires a reason**; re-fires on continued trend.
6. **Waiting-room watch** — every waiting patient with assigned acuity, a **deterioration sparkline over the wait**, current risk, last vitals, movement note, pull-forward; enforce "re-scores up freely, never down"; next-sweep timer.

**P2 (add if time):**
7. **EMS inbound / pre-arrival board** — inbound ambulances with ETA, provisional acuity, syndrome pre-notification.
8. **Handoff reconciliation** — captured MIST handoff vs telemetry; paramedic vs engine read; disagreement flag.
9. **Over-Trust Guard** — accept rate, median review time, **sub-3-second accepts**, probe pass rate; review-time-by-hour bars; auto-applied friction note; "aggregate only, not a ranking".
10. **Model drift & bias audit** — under-triage vs baseline + accepted false-alarm cost; calibration-drift bars; **equity table with fixed slices incl. age bands, interpreter-needed, and arrival mode**; "slices can be added, never removed".

## 8. Interactive behaviours to implement
- **Override logging:** overriding produces a visible **audit record** — recommendation, flag + reason codes, override reason, review latency, timestamp, model version, capture/consent state — shown in a drawer or on the audit screen.
- **Time simulation:** an "advance time / next sweep" control that re-scores waiting patients from their `serialVitals`, moves deterioration sparklines, and **fires an escalation** for the deteriorating case (e.g. R. Silva). This demonstrates the waiting-room watch without real-time infra.
- **Surge mode (3×):** a toggle that widens Catcher sensitivity, shortens the re-score interval, collapses the queue to a priority lane, and shows a surge banner.
- **Confidence everywhere:** the chip appears on every recommendation, not just flagged ones.
- Keyboard-accessible; visible focus rings.

## 9. Seed data (`src/data/patients.ts`) — 18–20 synthetic encounters
Include these named cases (keep continuity with the product), each with a scripted `captureSession`:
- **M. Rowe**, 67M, **ambulance**, "crushing chest pain, can't breathe", HR 132 / 82/54 / RR 28 / SpO₂ 86% → **ESI 1**, no mismatch (every channel already high); has prehospital ECG + STEMI **pre-notification**.
- **A. Duval**, 54F, **walk-in**, "just feeling weak and a bit feverish, off for a couple days", HR 104 / 108/72 / RR 22 / 38.1 °C, pain missing → **surface ESI 4 but Catcher fires → pull to ESI 2** (early-sepsis pattern), reinforced by a `weak`/`confusion` voice signal. **This is the thesis case.**
- **P. Nnamdi**, 78F, **ambulance**, "confused since this morning, not herself" → ESI 2 with **stroke screen incomplete → uncertainty gate on**; `slurred_speech` voice signal; **geriatric** band.
- **R. Silva**, 61M, **walk-in**, "short of breath, worse lying flat", serial vitals that **deteriorate over the wait** (HR 98→112, SpO₂→92) → re-scored **ESI 3 → ESI 2**, drives the escalation demo.
- **T. Adeyemi**, 29F, walk-in, "lower abdominal pain 6/10", **pregnancy status missing → not assumed normal**.
- A **pediatric** case (e.g. 3F, ambulance/walk-in, fever) scored on **pediatric age-band + weight-aware** thresholds.
- A **zero-history first-time** walk-in (no `priorHistory`) with widened confidence.
- An **interpreter-needed** walk-in (non-English `language` detected in capture) to populate the equity slice.
- Filler cases (ankle sprain, migraine, etc.) to reach ~18–20 and make the queue feel real.
Ensure the set collectively covers the brief's required mix: **≥1 ambiguous, ≥1 pediatric, ≥1 geriatric, ≥1 zero-history, ≥1 ambulance-with-trend, ≥1 walk-in-enriched**.

## 10. Acceptance criteria (verify each in the browser before done)
- [ ] App runs locally with `npm install && npm run dev`, no network calls at runtime.
- [ ] Queue shows 18–20 synthetic patients, sorted by priority then wait, with arrival-mode chips and fill-weight acuity.
- [ ] The **A. Duval** case demonstrably shows **surface ESI 4 → undertriage flag → recommended ESI 2** with a readable one-line why and full SHAP-style rationale incl. a voice signal.
- [ ] **Every** recommendation shows a **confidence indicator**; at least one case is gated for low confidence / missing data.
- [ ] Intake shows the **simulated capture panel** playing a transcript and auto-filling verbatim complaint + history chips + voice-signal chips, plus a "missing, not normal" panel.
- [ ] **Ambulance vs walk-in** are visibly handled differently (pre-notification / trend vs sparse-enriched), shown side by side.
- [ ] Advancing time **re-scores** waiting patients and **fires an escalation** for the deteriorating case; the system never lowers a human-assigned acuity.
- [ ] Assigning below the recommendation **requires an override reason** and produces a visible **audit record** with all listed fields.
- [ ] **Surge (3×) toggle** changes system posture (sensitivity, lane view, banner).
- [ ] Pediatric and geriatric cases are scored on **age-stratified** thresholds; the audit/equity view shows slices incl. arrival mode.
- [ ] The reserved clay tone appears **only** on under-triage flags.

## 11. Deliverables
1. The running app (all P1 screens; P2 as far as time allows).
2. `README.md` — run steps + a short "real vs simulated" note (deterministic engine, simulated capture, synthetic data).
3. `src/config/triageConfig.ts` with all tunable knobs commented.
4. A verification walkthrough artifact (screenshots or a short browser recording) demonstrating the acceptance criteria above.

Start by producing the plan artifact for Section 9's milestones and the screen order in Section 7, then build P1 end-to-end before P2.
