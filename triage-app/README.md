# PatientTriage.ai Prototype

A local, runnable prototype of the PatientTriage.ai emergency-department triage decision-support tool.

## Rule Zero
**The machine recommends, the nurse decides.** The tool provides explainable recommendations, but every decision is reviewable and overridable by the nurse.

## Running the App

The app is fully local. No cloud APIs, no databases, no external network calls at runtime.

1. Ensure you have Node.js installed.
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the dev server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open the displayed local URL (typically \`http://localhost:5173\`) in your browser.

## What's Real vs. Simulated
- **Engine**: The scoring engine is deterministic, rule-based, and explainable, replacing the real ML model.
- **Microphone / Voice**: Ambient capture is simulated using scripted transcripts. There is no real audio capture or ASR running.
- **Data**: All patient encounters are 100% synthetic, shipped locally in the codebase (\`src/data/patients.ts\`).

## Tunable Knobs
All configurable thresholds (age bands, surge triggers, wait-time targets, sepsis weights) can be adjusted in \`src/config/triageConfig.ts\`.
