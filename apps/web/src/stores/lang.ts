import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "tr";

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
    }),
    { name: "lf-lang" }
  )
);
