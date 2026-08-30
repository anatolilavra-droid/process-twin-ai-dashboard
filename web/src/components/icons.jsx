// Small hand-drawn icon set (not emoji, per accessibility guidance) — decorative,
// always paired with a visible text label, so each is aria-hidden.
function baseProps(className) {
  return {
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    className,
    'aria-hidden': 'true',
  };
}

export function BoltIcon({ className }) {
  return (
    <svg {...baseProps(className)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z" />
    </svg>
  );
}

export function StarIcon({ className }) {
  return (
    <svg {...baseProps(className)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m10 2 2.2 4.7 5.1.7-3.7 3.6.9 5.1L10 13.6l-4.5 2.5.9-5.1-3.7-3.6 5.1-.7L10 2Z"
      />
    </svg>
  );
}

export function ShieldIcon({ className }) {
  return (
    <svg {...baseProps(className)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2 3 5v5c0 4.4 3 7.4 7 8 4-.6 7-3.6 7-8V5l-7-3Z" />
    </svg>
  );
}

export function CircleDotIcon({ className }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
