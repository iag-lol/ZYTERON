export {};

declare global {
  interface Window {
    dataLayer: Array<IArguments | unknown[]>;
    gtag: (...args: unknown[]) => void;
  }
}
