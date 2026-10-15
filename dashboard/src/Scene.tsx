import { CrtBackground } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import type { CrtOptions } from "./shaders/crt/crtRenderer";

export interface SceneProps extends Partial<CrtOptions> {
  className?: string;
}

export function Scene({
  variant = "terminal",
  speed = 1.00,
  typeSpeed = 1.00,
  motion = 1.00,
  hue = 0,
  saturation = 1.00,
  brightness = 1.00,
  opacity = 1.00,
  className = "",
  logMode = "project",
  ...rest
}: SceneProps = {}) {
  return (
    <div className={`shader-frame ${className}`}>
      <CrtBackground
        variant={variant}
        speed={speed}
        typeSpeed={typeSpeed}
        motion={motion}
        hue={hue}
        saturation={saturation}
        brightness={brightness}
        opacity={opacity}
        logMode={logMode}
        {...rest}
      />
    </div>
  );
}
