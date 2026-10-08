import CelloStack from "@/components/originkit/ui/cello-stack";
import { heroCopy } from "./scene-config";

export function StaticHero({
  storeName,
  heading,
  images,
  onRestore,
}: {
  storeName: string;
  heading: string;
  images: string[];
  onRestore?: () => void;
}) {
  return (
    <div className="static-hero">
      <div className="static-hero-stage">
        <div className="static-hero-clip">
          <div className="static-hero-stack">
            <CelloStack images={images} background="transparent" drag={false} />
          </div>
        </div>
        <div className="static-hero-shade" aria-hidden="true" />
        <div className="static-hero-copy">
          <h1>{storeName}</h1>
          <p>{heading}</p>
          <a className="btn btn-primary" href="#shop">
            {heroCopy.shop}
          </a>
        </div>
        <div className="hero-actions">
          <a className="hero-skip" href="#shop">
            {heroCopy.skip}
          </a>
          {onRestore ? (
            <button className="hero-still" type="button" onClick={onRestore}>
              {heroCopy.motion}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
