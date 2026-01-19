export {};

declare global {
  interface Window {
    ytInitialPlayerResponse?: {
      videoDetails?: {
        author?: string;
      };
    };
    __tmyPlaybackRateBridgeInstalled?: boolean;
  }
}
