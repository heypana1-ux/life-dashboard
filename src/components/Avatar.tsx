import { AvatarConfig } from "@/lib/avatar";

/* Layered SVG avatar. viewBox 0 0 100 100. Head centered ~ (50,44), r 22. */
export function Avatar({ config, size = 96 }: { config: AvatarConfig; size?: number }) {
  const { skin, hair, hairColor, face, shirt, hat, glasses } = config;
  const cx = 50;
  const cy = 46;
  const r = 22;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0">
      {/* back hair (afro / long behind) */}
      {hair === "afro" && <circle cx={cx} cy={cy - 4} r={30} fill={hairColor} />}
      {hair === "long" && <rect x={cx - 26} y={cy - 6} width={52} height={46} rx={16} fill={hairColor} />}

      {/* body / shirt */}
      <path d={`M22 100 v-14 a28 28 0 0 1 56 0 v14 z`} fill={shirt} />
      <path d={`M22 100 v-14 a28 28 0 0 1 12 -22 l16 20 l16 -20 a28 28 0 0 1 12 22 v14 z`} fill="#ffffff" opacity="0.12" />

      {/* neck */}
      <rect x={cx - 7} y={cy + 12} width={14} height={16} rx={6} fill={skin} />

      {/* head */}
      <circle cx={cx} cy={cy} r={r} fill={skin} />
      {/* ears */}
      <circle cx={cx - r} cy={cy + 2} r={4} fill={skin} />
      <circle cx={cx + r} cy={cy + 2} r={4} fill={skin} />

      {/* front hair */}
      {hair === "short" && <path d={`M${cx - r} ${cy - 4} a${r} ${r} 0 0 1 ${2 * r} 0 q-${r} -18 -${2 * r} 0 z`} fill={hairColor} />}
      {hair === "buzz" && <path d={`M${cx - r + 2} ${cy - 8} a${r - 2} ${r - 2} 0 0 1 ${2 * (r - 2)} 0`} fill="none" stroke={hairColor} strokeWidth={7} strokeLinecap="round" />}
      {hair === "long" && <path d={`M${cx - r} ${cy - 4} a${r} ${r} 0 0 1 ${2 * r} 0 q-${r} -18 -${2 * r} 0 z`} fill={hairColor} />}
      {hair === "curly" && (
        <g fill={hairColor}>
          {[-16, -6, 4, 14].map((dx) => (
            <circle key={dx} cx={cx + dx} cy={cy - 16} r={8} />
          ))}
        </g>
      )}
      {hair === "bun" && (
        <>
          <circle cx={cx} cy={cy - 24} r={8} fill={hairColor} />
          <path d={`M${cx - r} ${cy - 4} a${r} ${r} 0 0 1 ${2 * r} 0 q-${r} -16 -${2 * r} 0 z`} fill={hairColor} />
        </>
      )}
      {hair === "mohawk" && <path d={`M${cx - 5} ${cy - 34} h10 v24 h-10 z`} fill={hairColor} />}
      {hair === "afro" && <circle cx={cx} cy={cy - 2} r={r} fill={skin} />}

      {/* face */}
      {face === "cool" || glasses === "sun" ? null : (
        <>
          <circle cx={cx - 8} cy={cy - 1} r={2.4} fill="#2b2b2b" />
          <circle cx={cx + 8} cy={cy - 1} r={2.4} fill="#2b2b2b" />
        </>
      )}
      {face === "wink" && <path d={`M${cx + 5} ${cy - 1} h6`} stroke="#2b2b2b" strokeWidth={2.4} strokeLinecap="round" />}
      {/* mouth */}
      {face === "happy" && <path d={`M${cx - 7} ${cy + 8} q7 8 14 0`} fill="none" stroke="#8a3b2e" strokeWidth={2.4} strokeLinecap="round" />}
      {face === "neutral" && <path d={`M${cx - 6} ${cy + 9} h12`} stroke="#8a3b2e" strokeWidth={2.4} strokeLinecap="round" />}
      {face === "cool" && <path d={`M${cx - 6} ${cy + 8} q6 5 12 0`} fill="none" stroke="#8a3b2e" strokeWidth={2.4} strokeLinecap="round" />}
      {face === "wink" && <path d={`M${cx - 7} ${cy + 8} q7 8 14 0`} fill="none" stroke="#8a3b2e" strokeWidth={2.4} strokeLinecap="round" />}

      {/* glasses */}
      {glasses === "glasses" && (
        <g fill="none" stroke="#333" strokeWidth={2}>
          <circle cx={cx - 8} cy={cy - 1} r={6} />
          <circle cx={cx + 8} cy={cy - 1} r={6} />
          <path d={`M${cx - 2} ${cy - 1} h4`} />
        </g>
      )}
      {glasses === "sun" && (
        <g stroke="#111" strokeWidth={2}>
          <circle cx={cx - 8} cy={cy - 1} r={6} fill="#111" />
          <circle cx={cx + 8} cy={cy - 1} r={6} fill="#111" />
          <path d={`M${cx - 2} ${cy - 1} h4`} />
        </g>
      )}

      {/* hats */}
      {hat === "cap" && (
        <g>
          <path d={`M${cx - r - 2} ${cy - 14} a${r + 2} ${r + 2} 0 0 1 ${2 * (r + 2)} 0 z`} fill="#ef4444" />
          <path d={`M${cx - r - 2} ${cy - 12} h18`} stroke="#ef4444" strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      {hat === "beanie" && <path d={`M${cx - r} ${cy - 10} a${r} ${r} 0 0 1 ${2 * r} 0 z`} fill="#0ea5e9" />}
      {hat === "party" && (
        <>
          <path d={`M${cx} ${cy - 38} L${cx - 12} ${cy - 14} h24 z`} fill="#db2777" />
          <circle cx={cx} cy={cy - 38} r={3} fill="#f59e0b" />
        </>
      )}
      {hat === "crown" && (
        <path d={`M${cx - 16} ${cy - 12} l0 -12 l6 6 l6 -10 l6 10 l6 -6 l0 12 z`} fill="#f5c518" stroke="#c9a227" strokeWidth={1} />
      )}
    </svg>
  );
}
