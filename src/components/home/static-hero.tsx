import { heroCopy } from "./scene-config";

export function StaticHero({ storeName, heading }: { storeName: string; heading: string }) {
  return (
    <div className="static-hero">
      <div className="static-hero-stage" aria-hidden="true">
        <span className="still-lipstick" />
        <span className="still-compact" />
        <span className="still-gloss" />
      </div>
      <div className="static-hero-copy">
        <h1>{storeName}</h1>
        <p>{heading}</p>
        <a className="btn btn-primary" href="#shop">
          {heroCopy.shop}
        </a>
      </div>
      <a className="hero-skip" href="#shop">
        {heroCopy.skip}
      </a>
    </div>
  );
}
