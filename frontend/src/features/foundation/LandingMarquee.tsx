// A broadcast-style ticker of the application's real capabilities and the real metrics it surfaces.
// It is decorative (aria-hidden) so it is never announced or double-read; the same capabilities are
// listed as real text below. The track is duplicated so the CSS -50% loop is seamless, and it pauses
// on hover. Motion is gated on prefers-reduced-motion in styles.css.
const ITEMS = [
  'Player search',
  'Season statistics',
  'Career trends',
  'Game logs',
  'Head-to-head comparison',
  'Shareable links',
  'PPG',
  'RPG',
  'APG',
  'FG%',
  '3P%',
  'FT%',
] as const;

export function LandingMarquee() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="marquee border-y border-white/10 bg-coal py-5" aria-hidden="true">
      <div className="marquee-track">
        {track.map((item, index) => (
          <span key={index} className="flex items-center whitespace-nowrap">
            <span className="display px-7 text-2xl font-semibold uppercase tracking-wide text-white/75">
              {item}
            </span>
            <span className="text-lg text-accent">&#9679;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
