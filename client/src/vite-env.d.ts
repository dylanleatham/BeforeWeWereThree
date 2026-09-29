/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Display names for friend-letter recipients, baked in at build time */
  readonly VITE_RECIPIENT_NAME_YOU?: string;
  readonly VITE_RECIPIENT_NAME_PARTNER?: string;
  readonly VITE_RECIPIENT_NAME_BABY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
