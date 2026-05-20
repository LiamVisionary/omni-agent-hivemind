import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

export const HivemindShowcase = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070b" }}>
      <OffthreadVideo
        src={staticFile("remotion/hivemind-showcase-capture.webm")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        muted
      />
    </AbsoluteFill>
  );
};
