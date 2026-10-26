/// <reference types="vite/client" />

declare const __BUILD_YEAR__: number;

interface Window {
  /** Marcado quando o React hidrata (index.html usa como rede de segurança). */
  __vopReady?: boolean;
}
