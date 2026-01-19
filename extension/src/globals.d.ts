export {};

declare global {
  const __BUILD_MODE__: 'debug' | 'prod';
  const __BUILD_GIT_HASH__: string;
  const __BUILD_TIME__: string;

  interface Window {
    ytInitialPlayerResponse?: {
      videoDetails?: {
        author?: string;
      };
    };
    __tmyPlaybackRateBridgeInstalled?: boolean;
  }
}
