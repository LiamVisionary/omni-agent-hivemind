import { Composition } from "remotion";
import { HivemindShowcase } from "./Showcase";

export const SHOWCASE_FPS = 30;
export const SHOWCASE_DURATION_IN_FRAMES = SHOWCASE_FPS * 40;

export const RemotionRoot = () => {
  return (
    <Composition
      id="HivemindShowcase"
      component={HivemindShowcase}
      durationInFrames={SHOWCASE_DURATION_IN_FRAMES}
      fps={SHOWCASE_FPS}
      width={1920}
      height={1080}
    />
  );
};
