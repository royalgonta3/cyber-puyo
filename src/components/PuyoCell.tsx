"use client";

import { PuyoType } from "@/lib/puyo-game";

interface Props {
  color: PuyoType;
  isClearing?: boolean;
  isBlasted?: boolean;
  isLanding?: boolean;
  neighbors?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
}

const colorConfig: Record<PuyoType, {
  base: string;
  glow: string;
  clearAnim: string;
  eyeScleraAnim: string;
  eyePupilAnim: string;
}> = {
  red: {
    base: "from-red-300 via-red-500 to-red-800",
    glow: "shadow-[0_0_18px_4px_rgba(239,68,68,0.8)]",
    clearAnim: "animate-clear-red",
    eyeScleraAnim: "animate-eyes-red",
    eyePupilAnim: "",
  },
  blue: {
    base: "from-blue-300 via-indigo-600 to-indigo-950",
    glow: "shadow-[0_0_18px_4px_rgba(99,102,241,0.8)]",
    clearAnim: "animate-clear-blue",
    eyeScleraAnim: "animate-eyes-blue",
    eyePupilAnim: "",
  },
  green: {
    base: "from-lime-200 via-green-500 to-green-800",
    glow: "shadow-[0_0_18px_4px_rgba(16,185,129,0.8)]",
    clearAnim: "animate-clear-green",
    eyeScleraAnim: "",
    eyePupilAnim: "animate-eyes-green",
  },
  yellow: {
    base: "from-yellow-100 via-yellow-300 to-amber-400",
    glow: "shadow-[0_0_18px_4px_rgba(234,179,8,0.8)]",
    clearAnim: "animate-clear-yellow",
    eyeScleraAnim: "animate-eyes-yellow",
    eyePupilAnim: "",
  },
  purple: {
    base: "from-purple-400 via-purple-500 to-purple-700",
    glow: "shadow-[0_0_18px_4px_rgba(168,85,247,0.8)]",
    clearAnim: "animate-clear-purple",
    eyeScleraAnim: "",
    eyePupilAnim: "animate-eyes-purple",
  },
  ojama: {
    base: "from-gray-200 via-gray-400 to-gray-600",
    glow: "shadow-[0_0_10px_3px_rgba(156,163,175,0.5)]",
    clearAnim: "animate-clear-ojama",
    eyeScleraAnim: "animate-eyes-ojama",
    eyePupilAnim: "",
  },
  bomb: {
    base: "from-orange-500 via-red-700 to-gray-950",
    glow: "shadow-[0_0_22px_6px_rgba(251,146,60,0.85)]",
    clearAnim: "animate-clear-bomb",
    eyeScleraAnim: "",
    eyePupilAnim: "animate-eyes-bomb",
  },
};

function Eye({ scleraAnim, pupilAnim }: { scleraAnim: string; pupilAnim: string }) {
  return (
    <div
      className={`relative rounded-full bg-white overflow-hidden flex items-center justify-center ${scleraAnim}`}
      style={{ width: "38%", aspectRatio: "1", transformOrigin: "center" }}
    >
      <div
        className={`rounded-full bg-gray-900 relative flex-shrink-0 ${pupilAnim}`}
        style={{ width: "58%", height: "58%", transformOrigin: "center" }}
      >
        <div
          className="absolute bg-white rounded-full opacity-90"
          style={{ width: "36%", height: "36%", top: "12%", left: "12%" }}
        />
      </div>
    </div>
  );
}

export default function PuyoCell({
  color,
  isClearing = false,
  isBlasted = false,
  isLanding = false,
  neighbors,
}: Props) {
  const cfg = colorConfig[color];

  const isSpecial = color === "ojama" || color === "bomb";
  const borderRadius = isSpecial
    ? "50%"
    : [
        neighbors?.top ? "2px" : "50%",
        neighbors?.right ? "2px" : "50%",
        neighbors?.bottom ? "2px" : "50%",
        neighbors?.left ? "2px" : "50%",
      ].join(" ");

  return (
    <div
      className={`
        relative w-full h-full
        ${isClearing ? cfg.clearAnim : ""}
        ${isBlasted ? "animate-blast" : ""}
        ${isLanding ? "animate-land" : ""}
      `}
      style={{ borderRadius }}
    >
      {/* 3D body */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${cfg.base} ${cfg.glow} transition-all duration-150`}
        style={{ borderRadius }}
      />

      {/* Bomb pulsing glow ring */}
      {color === "bomb" && (
        <div className="absolute inset-0 animate-bomb-glow" style={{ borderRadius }} />
      )}

      {/* ── Fruit highlights (per color) ── */}

      {/* Apple: tall teardrop shine */}
      {color === "red" && (
        <>
          <div className="absolute bg-white rounded-full opacity-65"
            style={{ top: "10%", left: "20%", width: "16%", height: "32%" }} />
          <div className="absolute bg-white rounded-full opacity-88"
            style={{ top: "13%", left: "24%", width: "8%", height: "11%" }} />
        </>
      )}
      {/* Blueberry: soft matte bloom */}
      {color === "blue" && (
        <div className="absolute bg-blue-200 rounded-full opacity-28"
          style={{ top: "14%", left: "16%", width: "28%", height: "18%" }} />
      )}
      {/* Leaf: small specular */}
      {color === "green" && (
        <>
          <div className="absolute bg-lime-100 rounded-full opacity-50"
            style={{ top: "10%", left: "12%", width: "32%", height: "20%" }} />
          <div className="absolute bg-white rounded-full opacity-60"
            style={{ top: "13%", left: "16%", width: "12%", height: "9%" }} />
        </>
      )}
      {/* Lemon: bright waxy elongated shine */}
      {color === "yellow" && (
        <>
          <div className="absolute bg-white rounded-full opacity-70"
            style={{ top: "8%", left: "22%", width: "14%", height: "32%" }} />
          <div className="absolute bg-white rounded-full opacity-92"
            style={{ top: "11%", left: "26%", width: "7%", height: "10%" }} />
        </>
      )}
      {/* Default highlight for purple / ojama / bomb */}
      {(color === "purple" || color === "ojama" || color === "bomb") && (
        <>
          <div className="absolute bg-white rounded-full opacity-50"
            style={{ top: "12%", left: "12%", width: "30%", height: "20%" }} />
          <div className="absolute bg-white rounded-full opacity-80"
            style={{ top: "16%", left: "18%", width: "12%", height: "10%" }} />
        </>
      )}

      {/* inner shadow for depth */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius,
          boxShadow: "inset -3px -3px 8px rgba(0,0,0,0.35), inset 2px 2px 4px rgba(255,255,255,0.15)",
        }}
      />
      {/* scan-line overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          borderRadius,
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.15) 4px)",
        }}
      />

      {/* ── Fruit decorations ── */}

      {/* Apple: stem + leaf */}
      {color === "red" && (
        <>
          <div className="absolute bg-amber-900 rounded-sm"
            style={{ width: "6%", height: "13%", top: "2%", left: "49%", transform: "rotate(8deg)" }} />
          <div className="absolute bg-green-600"
            style={{ width: "20%", height: "11%", top: "2%", left: "55%",
              borderRadius: "70% 0 70% 0", transform: "rotate(-20deg)" }} />
        </>
      )}

      {/* Blueberry: dried-flower crown (5 petals) */}
      {color === "blue" && (
        <div className="absolute" style={{ top: "3%", left: "50%", transform: "translateX(-50%)", width: "28%", height: "16%" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute bg-indigo-200 rounded-full opacity-80"
              style={{
                width: "18%", height: "42%",
                top: "0%", left: "41%",
                transformOrigin: "50% 100%",
                transform: `rotate(${i * 72}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Leaf: central vein */}
      {color === "green" && (
        <div className="absolute bg-white rounded-full opacity-18"
          style={{ width: "54%", height: "5%", top: "43%", left: "23%", transform: "rotate(-8deg)" }} />
      )}

      {/* Lemon: top and bottom bumps */}
      {color === "yellow" && (
        <>
          <div className="absolute bg-yellow-100 rounded-full opacity-80"
            style={{ width: "18%", height: "9%", top: "1%", left: "41%" }} />
          <div className="absolute bg-amber-300 rounded-full opacity-55"
            style={{ width: "15%", height: "8%", bottom: "1%", left: "42%" }} />
        </>
      )}

      {/* Ojama: grumpy eyebrows */}
      {color === "ojama" && (
        <>
          <div className="absolute bg-gray-700 rounded-full"
            style={{ width: "24%", height: "5%", top: "36%", left: "14%", transform: "rotate(28deg)" }} />
          <div className="absolute bg-gray-700 rounded-full"
            style={{ width: "24%", height: "5%", top: "36%", right: "14%", transform: "rotate(-28deg)" }} />
        </>
      )}

      {/* Bomb: star indicator */}
      {color === "bomb" && (
        <div
          className="absolute text-yellow-300 animate-bomb-glow"
          style={{ top: "8%", left: "50%", transform: "translateX(-50%)",
            fontSize: "36%", lineHeight: 1, fontWeight: "bold",
            textShadow: "0 0 4px rgba(251,146,60,0.9)" }}
        >
          ★
        </div>
      )}

      {/* Eyes */}
      <div
        className="absolute flex items-center justify-between pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translateX(-50%)", width: "60%" }}
      >
        <Eye scleraAnim={cfg.eyeScleraAnim} pupilAnim={cfg.eyePupilAnim} />
        <Eye scleraAnim={cfg.eyeScleraAnim} pupilAnim={cfg.eyePupilAnim} />
      </div>
    </div>
  );
}
