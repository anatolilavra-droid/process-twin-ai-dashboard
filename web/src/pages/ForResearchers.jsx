const RESEARCH_QUESTIONS = [
  {
    question: 'How should AI decisions be visualized so non-experts understand the logic and trust the system?',
    status:
      "ExplanationPanel (top-3 factors + a plain-language summary) is one candidate answer — untested against alternatives (causal graphs, feature-importance charts, etc.).",
  },
  {
    question: 'Which explanation types (causal, feature-importance, "what-if") are most useful to operators?',
    status:
      'Only one type is implemented — a rule-trace narrated by an LLM. Comparing it against others needs a study this repository doesn’t run.',
  },
  {
    question: 'How should human-in-the-loop interfaces be designed so a person can override an AI decision?',
    status:
      'The override flow and decision_log make override behavior observable (override rate, reasons given) — but it hasn’t been measured with real operators, only exercised manually.',
  },
  {
    question: 'How is the impact of AI recommendations on decision quality measured (time, deadlines, satisfaction)?',
    status:
      'Planned on-time rate and average processing time are a first, honestly-scoped attempt — deadline/time are covered, satisfaction is not, and there is no real order-completion tracking yet.',
  },
];

const LIMITATIONS = [
  'Scheduler is a deterministic heuristic (earliest-deadline-first + type priority), not a learned model.',
  'No order ever reaches a real "done" state, so the on-time metric is prospective (is the plan on track), not actual completion.',
  'Scheduler ignores specialists’ working hours and day boundaries — treats them as available back-to-back.',
  'No authentication — single-tenant, permissive CORS. Not a production posture.',
  'No user study has been run — the research questions above are open, not answered.',
];

function ForResearchers() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">For researchers</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Process Twin AI Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          A research prototype exploring how an AI can support — not replace — operational decisions: a simulated
          small service company where an AI proposes a schedule, explains it in plain language, and a human operator
          can accept or override it, with every decision logged.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Research questions</h2>
        <p className="mt-1 text-xs text-ink-faint">
          No user testing has been run yet — this states what the prototype currently makes measurable, not results.
        </p>
        <ol className="mt-3 flex flex-col gap-4">
          {RESEARCH_QUESTIONS.map((item, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-ink">{item.question}</p>
              <p className="mt-1.5 text-sm text-ink-muted">{item.status}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Architecture</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Node.js + Express + SQLite backend, React + Vite + Tailwind frontend. Key pieces: a deterministic
          scheduling heuristic, an explanation service (Claude, structured output, with a deterministic fallback
          when the LLM is unreachable), a human accept/override flow with a full decision log, and metrics computed
          only from what's actually tracked. Full schema and API reference in{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">docs/spec.md</code> in the repository.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Known limitations</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-muted">
          {LIMITATIONS.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true">–</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Contact</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Anatoli Lavra — independent AI-driven architect &amp; product creator, based in Leipzig, Germany.
          <br />
          [add preferred contact — email or LinkedIn]
        </p>
      </section>
    </div>
  );
}

export default ForResearchers;
