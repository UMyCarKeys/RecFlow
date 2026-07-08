// troika-three-text ships no TypeScript types. We only touch preloadFont (to
// warm the font parse + glyph SDF generation at browser idle — see VinylScene);
// drei's <Text> wraps the rest with its own typings.
declare module 'troika-three-text' {
  export function preloadFont(
    options: { font?: string; characters?: string | string[]; sdfGlyphSize?: number },
    callback?: () => void,
  ): void
}
