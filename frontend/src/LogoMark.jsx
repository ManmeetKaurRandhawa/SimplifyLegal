export default function LogoMark({ compact = false, withWordmark = true }) {
  return (
    <div className={`logo-lockup${compact ? " compact" : ""}`}>
      <svg className="logo-mark" viewBox="0 0 240 240" role="img" aria-label="SimplifyLegal logo">
        <defs>
          <linearGradient id="shieldGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#b23df3" />
            <stop offset="100%" stopColor="#17a8f4" />
          </linearGradient>
        </defs>
        <path
          d="M120 18C149 37 179 44 206 46C208 105 205 161 120 212C35 161 32 105 34 46C61 44 91 37 120 18Z"
          fill="url(#shieldGradient)"
        />
        <path
          d="M62 145C88 174 123 186 160 185C131 204 120 212 120 212C92 196 71 178 58 155Z"
          fill="rgba(255,255,255,0.96)"
        />
        <path
          d="M58 154C103 188 151 178 208 123C181 165 151 196 119 216C92 200 71 180 58 154Z"
          fill="rgba(255,255,255,0.96)"
        />
        <path d="M115 54h10v95c0 11-9 20-20 20h30c-11 0-20-9-20-20V54Z" fill="#fff" />
        <path d="M78 74h84c4 0 8 4 8 8s-4 8-8 8H78c-4 0-8-4-8-8s4-8 8-8Z" fill="#fff" />
        <circle cx="76" cy="82" fill="#fff" r="8" />
        <circle cx="120" cy="58" fill="#fff" r="8" />
        <circle cx="164" cy="82" fill="#fff" r="8" />
        <path d="M88 90l-20 38h40L88 90Z" fill="none" stroke="#fff" strokeWidth="4" />
        <path d="M152 90l-20 38h40L152 90Z" fill="none" stroke="#fff" strokeWidth="4" />
      </svg>
      {withWordmark ? <div className="logo-wordmark">SimplifyLegal</div> : null}
    </div>
  );
}
