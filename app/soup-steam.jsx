import './soup-steam.css';

// Local visual experiment: set false to restore the original background.
const ENABLE_SOUP_STEAM = true;

export default function SoupSteam() {
  if (!ENABLE_SOUP_STEAM) return null;

  return (
    <div className="soup-steam" aria-hidden="true">
      <div className="soup-steam-image">
        <div className="soup-steam-source">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
