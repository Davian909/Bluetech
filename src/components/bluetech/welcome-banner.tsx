export function WelcomeBanner({ wilayah }: { wilayah: string }) {
  const showWilayah = wilayah !== "Teluk Ambon Utara";
  return (
    <section
      aria-label="Sambutan"
      className="aurora-ocean relative min-h-[132px] overflow-hidden rounded-2xl border border-ocean-700/40 shadow-[0_18px_44px_-18px_rgba(7,44,71,0.55)]"
    >
      {/* soft noise dots */}
      <div aria-hidden="true" className="dot-grid absolute inset-0 opacity-[0.16]" />

      {/* twinkling particles */}
      <div aria-hidden="true" className="absolute inset-0">
        {[
          { l: "12%", t: "22%", s: 3, d: "0s" },
          { l: "30%", t: "60%", s: 2, d: "1.2s" },
          { l: "55%", t: "18%", s: 2.5, d: "2s" },
          { l: "72%", t: "48%", s: 2, d: "0.6s" },
          { l: "84%", t: "24%", s: 3, d: "1.8s" },
          { l: "44%", t: "34%", s: 2, d: "2.6s" },
          { l: "64%", t: "12%", s: 1.8, d: "3.4s" },
          { l: "92%", t: "56%", s: 2.2, d: "0.9s" },
        ].map((p, i) => (
          <span
            key={i}
            className="animate-float-soft absolute rounded-full bg-cream-100/80"
            style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDelay: p.d }}
          />
        ))}
      </div>

      {/* rising bubbles */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {[
          { l: "22%", s: 6, dur: "10s", del: "0s", drift: "12px" },
          { l: "47%", s: 4, dur: "12s", del: "3s", drift: "-10px" },
          { l: "68%", s: 7, dur: "9s", del: "5.5s", drift: "14px" },
          { l: "88%", s: 3.5, dur: "13s", del: "1.6s", drift: "-8px" },
        ].map((b, i) => (
          <span
            key={i}
            className="bubble opacity-40"
            style={{
              left: b.l,
              width: b.s,
              height: b.s,
              ["--bubble-dur" as string]: b.dur,
              ["--bubble-delay" as string]: b.del,
              ["--bubble-drift" as string]: b.drift,
            }}
          />
        ))}
      </div>

      {/* Illustration layer */}
      <svg
        viewBox="0 0 1200 132"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="wv1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e5e58" />
            <stop offset="100%" stopColor="#147d67" />
          </linearGradient>
          <linearGradient id="wv2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1d80b2" />
            <stop offset="100%" stopColor="#0e6e63" />
          </linearGradient>
          <linearGradient id="wv3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3f9cc6" />
            <stop offset="100%" stopColor="#1e9c80" />
          </linearGradient>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* distant land */}
        <path d="M690 100 C 760 70, 840 74, 890 90 C 940 104, 1000 104, 1060 90 L 1060 132 L 690 132 Z" fill="#0b3d5f" opacity="0.8" />

        {/* ship — gentle bobbing */}
        <g className="animate-bob" transform="translate(812 30)">
          <path d="M4 34 L 96 34 L 86 48 L 14 48 Z" fill="#f5ecd4" />
          <rect x="18" y="22" width="62" height="12" rx="3" fill="#ffffff" />
          <rect x="28" y="10" width="34" height="12" rx="3" fill="#d9edf6" />
          <rect x="34" y="13" width="10" height="6" rx="1" fill="#3f9cc6" />
          <rect x="48" y="13" width="9" height="6" rx="1" fill="#3cb899" />
          <rect x="55" y="2" width="3.5" height="20" fill="#d9c493" />
          <path d="M58.5 3 L 72 6 L 58.5 9 Z" fill="#e86a5e" />
          <path d="M8 52 L 96 52" stroke="#ffffff" strokeWidth="2.5" opacity="0.55" strokeLinecap="round" />
        </g>

        {/* lighthouse light beam — sweeping cone */}
        <g className="lighthouse-beam">
          <polygon points="1120,40 1330,-6 1330,86" fill="url(#beamGrad)" />
        </g>

        {/* lighthouse with glow */}
        <g transform="translate(1090 22)">
          <circle cx="30" cy="16" r="26" fill="#f5ecd4" opacity="0.14" />
          <circle cx="30" cy="16" r="14" fill="#f5ecd4" opacity="0.16" />
          <ellipse cx="30" cy="84" rx="40" ry="9" fill="#041d30" opacity="0.7" />
          <path d="M20 84 L 24 24 L 36 24 L 40 84 Z" fill="#f5ecd4" />
          <path d="M22.4 38 L 37.6 38 L 38.6 48 L 21.4 48 Z" fill="#e86a5e" />
          <path d="M21.4 62 L 38.6 62 L 39.4 72 L 20.6 72 Z" fill="#e86a5e" />
          <rect x="22" y="12" width="16" height="12" rx="2" fill="#0b3d5f" />
          <path d="M18 12 L 42 12 L 30 2 Z" fill="#072c47" />
          <circle cx="30" cy="18" r="3.2" fill="#ffe9a8" className="animate-pulse-soft" />
        </g>

        {/* 3 seamless animated wave bands */}
        <g className="wave-band-slower" fill="url(#wv1)" opacity="0.85">
          <path d="M0 104 C 150 96, 260 110, 420 104 C 580 98, 700 112, 860 104 C 1020 98, 1120 110, 1200 104 L 1200 132 L 0 132 Z M1200 104 L 2400 104" />
          <path transform="translate(1200 0)" d="M0 104 C 150 96, 260 110, 420 104 C 580 98, 700 112, 860 104 C 1020 98, 1120 110, 1200 104 L 1200 132 L 0 132 Z" />
        </g>
        <g className="wave-band-slow" fill="url(#wv2)" opacity="0.9">
          <path d="M0 112 C 200 104, 340 118, 560 112 C 780 106, 940 120, 1200 112 L 1200 132 L 0 132 Z" />
          <path transform="translate(1200 0)" d="M0 112 C 200 104, 340 118, 560 112 C 780 106, 940 120, 1200 112 L 1200 132 L 0 132 Z" />
        </g>
        <g className="wave-band" fill="url(#wv3)" opacity="0.95">
          <path d="M0 121 C 150 115, 260 127, 420 121 C 580 115, 700 127, 860 121 C 1020 115, 1120 125, 1200 120 L 1200 132 L 0 132 Z" />
          <path transform="translate(1200 0)" d="M0 121 C 150 115, 260 127, 420 121 C 580 115, 700 127, 860 121 C 1020 115, 1120 125, 1200 120 L 1200 132 L 0 132 Z" />
        </g>

        {/* foam strokes */}
        <g stroke="#f5ecd4" strokeWidth="2" strokeLinecap="round" opacity="0.6" fill="none">
          <path d="M300 126 q 6 -4 12 0 q 6 4 12 0" />
          <path d="M960 124 q 6 -4 12 0 q 6 4 12 0" />
        </g>
      </svg>

      <div className="relative flex min-h-[132px] flex-col justify-center px-5 py-5 sm:px-8">
        <span className="mb-1.5 inline-flex w-fit items-center gap-1.5 rounded-full border border-cream-100/25 bg-white/10 px-3 py-1 text-[10.5px] font-semibold tracking-[0.14em] text-cream-100 uppercase backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="ping-ring absolute h-full w-full rounded-full bg-reef-300" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-reef-300" />
          </span>
          Sistem Monitoring Pesisir · Live Demo
        </span>
        <h2 className="text-[21px] leading-tight font-extrabold text-cream-50 drop-shadow-sm sm:text-[26px]">
          Selamat Datang di{" "}
          <span className="bg-[linear-gradient(92deg,#7eddc5,#a3e4cf_55%,#f5ecd4)] bg-clip-text text-transparent">
            Bluetech
          </span>
        </h2>
        <p className="mt-1 max-w-xl text-[13px] text-cream-100/85 sm:text-[14px]">
          Platform integratif untuk perencanaan pemanfaatan laut dan mitigasi risiko pesisir.
        </p>
        {showWilayah && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-medium text-cream-100 backdrop-blur-sm">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
              <path d="M6 1 C 3.8 1, 2 2.8, 2 5 C 2 7.9, 6 11, 6 11 C 6 11, 10 7.9, 10 5 C 10 2.8, 8.2 1, 6 1 Z M6 6.4 C 5.1 6.4, 4.4 5.7, 4.4 4.8 C 4.4 3.9, 5.1 3.2, 6 3.2 C 6.9 3.2, 7.6 3.9, 7.6 4.8 C 7.6 5.7, 6.9 6.4, 6 6.4 Z" />
            </svg>
            Wilayah aktif: <b className="font-semibold">{wilayah}</b>
          </p>
        )}
      </div>
    </section>
  );
}
