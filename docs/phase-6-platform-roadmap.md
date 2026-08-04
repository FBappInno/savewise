# Phase 6 – Personal Intelligence Platform

Phase 6 is a product roadmap. The first implementation establishes a stable
platform layer above the existing Library, Second Brain and Research Agent.

## Architecture principles

- The AI-generated knowledge graph remains the source of truth for structure.
- Every structural change is versioned as a local learning event.
- Predictions and recommendations always expose graph nodes, discoveries or
  research candidates as evidence.
- External research is optional and clearly separated from personal-library
  evidence.
- Persistence stays behind replaceable stores so local files can later be
  exchanged for encrypted local databases or optional cloud adapters.

## Prioritized work packages

1. **Platform contracts and learning journal — implemented**
   Version graph changes, calculate explainable deltas and persist them locally.
2. **Proactive intelligence — implemented foundation**
   Derive next-interest, emerging-focus and project-gap predictions from the AI
   graph and Research Agent state; expose traceable recommendations.
3. **Personal work assistant — implemented foundation**
   Produce meeting briefs, presentations, project summaries, learning plans,
   talk outlines and business cases with separated library and verified web
   citations.
4. **Background orchestration — next**
   Replace process-local scheduling with a durable job queue, retry policies,
   cancellation and platform-specific background execution.
5. **Long-term project memory — next**
   Add explicit projects, goals, deadlines and user corrections with temporal
   history instead of inferring every signal from saved content.
6. **Evaluation and governance — next**
   Add recommendation feedback, citation audits, prompt/version evaluation,
   retention controls and per-module AI/privacy permissions.
7. **Optional synchronization — later**
   Introduce an encrypted sync adapter without changing domain services or
   making cloud storage mandatory.

## Deliberately not included in this increment

- Unattended operating-system background execution while the backend is off
- Automatic permanent saving of researched content without user approval
- A general-purpose internet chatbot
- Cloud accounts or synchronization
- Autonomous actions outside the personal knowledge and research scope
