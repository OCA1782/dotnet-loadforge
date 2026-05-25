"use client";

import { useLangStore } from "@/stores/lang";
import { translate } from "@/lib/i18n";

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: string, fallback?: string) => translate(lang, key, fallback);
}
