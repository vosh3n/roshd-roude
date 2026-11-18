"use client";

/**
 * «رشد» — ماسکات سادهٔ سایت. یک جوانهٔ گرد و مهربان که در صفحهٔ اول، \
 * داشبورد و حالت‌های خالی کوتاه و صمیمی حرف می‌زند.
 */

type Mood = "happy" | "cheer" | "think" | "sleepy";

const MOOD_EYES: Record<Mood, string> = {
  happy: "M -14 -2 q 4 -4 8 0 M 6 -2 q 4 -4 8 0",
  cheer: "M -14 -4 q 4 6 8 0 M 6 -4 q 4 6 8 0",
  think: "M -14 -2 h 8 M 6 -2 h 8",
  sleepy: "M -14 -1 q 4 3 8 0 M 6 -1 q 4 3 8 0",
};

const MOOD_MOUTH: Record<Mood, string> = {
  happy: "M -6 12 q 6 7 12 0",
  cheer: "M -8 10 q 8 12 16 0",
  think: "M -4 14 h 8",
  sleepy: "M -5 13 q 5 4 10 0",
};

export default function Mascot({
  text,
  mood = "happy",
  size = 76,
  name = true,
}: {
  text: string;
  mood?: Mood;
  size?: number;
  name?: boolean;
}) {
  return (
    <div className={"mascot mascot-" + mood}>
      <div className="mascot-figure" aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 120 120" role="presentation">
          <defs>
            <linearGradient id="mascotBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--field-1, #6aa9ff)" />
              <stop offset="100%" stopColor="var(--field-2, #9be7c4)" />
            </linearGradient>
          </defs>
          {/* سایهٔ نرم زیر بدن */}
          <ellipse cx="60" cy="108" rx="30" ry="6" fill="rgba(0,0,0,.18)" />
          {/* جوانه روی سر */}
          <path
            d="M60 26 q -2 -14 10 -18 q 2 12 -10 18"
            fill="var(--field-2, #9be7c4)"
            opacity=".95"
          />
          {/* بدن */}
          <circle cx="60" cy="64" r="34" fill="url(#mascotBody)" />
          {/* لپ‌ها */}
          <circle cx="42" cy="72" r="6" fill="#ffffff" opacity=".28" />
          <circle cx="78" cy="72" r="6" fill="#ffffff" opacity=".28" />
          {/* چشم‌ها و لبخند */}
          <g
            transform="translate(60 60)"
            stroke="#12231c"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          >
            <path d={MOOD_EYES[mood]} />
            <path d={MOOD_MOUTH[mood]} />
          </g>
        </svg>
      </div>
      <div className="mascot-bubble">
        {name ? <span className="mascot-name">رشد</span> : null}
        <p>{text}</p>
      </div>
    </div>
  );
}
