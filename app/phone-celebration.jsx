/* oxlint-disable next/no-img-element -- Reuse the game's preloaded local sprite without an image service. */
export default function PhoneCelebration({ level, basePath, height }) {
  return (
    <div className="phone-celebration" style={{ height: Math.min(200, height * 0.4) }}>
      <div className="phone-celebration-art" aria-hidden="true">
        <img src={`${basePath}/assets/can-7.png`} alt="" />
      </div>
      <output className="phone-celebration-caption" aria-live="polite" aria-atomic="true">
        <strong>Level {level}!</strong>
        <span>Soup-er work!</span>
      </output>
    </div>
  );
}
