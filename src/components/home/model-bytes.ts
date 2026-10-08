export function isGlbPayload(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46 &&
    bytes[4] === 2 &&
    bytes[5] === 0 &&
    bytes[6] === 0 &&
    bytes[7] === 0
  );
}

export function findClip<T extends { name: string }>(animations: readonly T[], clip: string) {
  return animations.find((item) => item.name === clip) ?? animations[0] ?? null;
}
