export function CaseMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 10h9l3 4h13v16H8z" fill="currentColor" />
      <path
        d="M16 21a4 4 0 1 1 8 0c0 3-4 2.5-4 5m0 2v1"
        stroke="var(--badge-ink)"
        strokeWidth="2"
      />
    </svg>
  );
}

function CaseIllustration() {
  return (
    <svg className="agency-art" viewBox="0 0 420 315" aria-hidden="true">
      <defs>
        <pattern
          id="case-grid"
          width="19"
          height="19"
          patternUnits="userSpaceOnUse"
        >
          <path d="M19 0H0v19" stroke="var(--art-line)" fill="none" />
        </pattern>
      </defs>
      <path d="M0 0h420v315H0z" fill="url(#case-grid)" />
      <path
        d="M0 264L390 42M29 315L420 92"
        stroke="var(--art-line)"
        strokeDasharray="4 7"
      />
      <g
        transform="rotate(-13 205 170)"
        stroke="var(--art-ink)"
        strokeWidth="3"
      >
        <path d="M78 104h81l17 17h153v135H78z" fill="var(--art-folder)" />
        <path d="M100 95h183v138H100z" fill="var(--art-paper)" />
        <path d="M116 115h38m-38 13h64m-64 13h58" opacity=".42" />
        <path d="M78 167h87l13-12h151v101H78z" fill="var(--art-folder)" />
        <path d="M105 190h58v35h-58z" fill="var(--art-paper)" />
        <path d="M116 203h36m-36 10h24" opacity=".53" />
      </g>
      <g
        transform="rotate(13 237 149)"
        stroke="var(--art-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        <path
          d="M195 184q-14-24-8-52l-9-39 42 18q18-5 39 2l38-20-5 41q13 32-6 53l13 21h-111z"
          fill="var(--art-mascot)"
        />
        <path d="M227 165h8l-4 5z" fill="var(--art-ink)" />
        <path d="M220 178q11 8 20 0" fill="none" strokeLinecap="round" />
        <path d="M239 148q9-13 20 0" fill="none" strokeLinecap="round" />
        <circle cx="203" cy="149" r="24" fill="var(--art-paper)" />
        <path d="m184 167-24 28" strokeWidth="10" strokeLinecap="round" />
        <circle cx="206" cy="150" r="5" fill="var(--art-ink)" />
        <path
          d="M193 143q3-7 10-8"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M201 125q9-33 27-41l35 9 12 37z" fill="var(--art-ink)" />
        <path d="M191 126q53-5 97 10" strokeWidth="8" strokeLinecap="round" />
      </g>
      <path
        d="M338 58v26m-13-13h26M63 147v17m-8-8h16m265 73v18m-9-9h18"
        stroke="var(--art-ink)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AgencyHero() {
  return (
    <div className="agency-hero">
      <div className="agency-wordmark">
        <CaseMark className="agency-mark" />
        <h1>
          Who Said
          <br />
          That<span>?</span>
        </h1>
        <p>Every comment leaves a clue.</p>
      </div>
      <CaseIllustration />
    </div>
  );
}
