/** biome-ignore-all lint/complexity/useOptionalChain: Window doesn't exist in the server */
export const canUseDOM =
  typeof window !== "undefined" && window.document?.createElement;
