import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en"
import hi from "./locales/hi"
import ja from "./locales/ja"
import ko from "./locales/ko"
import ru from "./locales/ru"
import zh from "./locales/zh"
import zhTW from "./locales/zh-TW"

export const supportedLanguages = [
  {
    code: "en",
    label: "English",
  },
  {
    code: "zh",
    label: "简体中文",
  },
  {
    code: "zh-TW",
    label: "繁體中文",
  },
  {
    code: "hi",
    label: "हिन्दी",
  },
  {
    code: "ko",
    label: "한국어",
  },
  {
    code: "ja",
    label: "日本語",
  },
  {
    code: "ru",
    label: "Русский",
  },
] as const

const supportedLanguageCodes = supportedLanguages.map(
  (language) => language.code
)

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: supportedLanguageCodes,
    load: "all",
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en,
      hi,
      zh,
      "zh-TW": zhTW,
      ko,
      ja,
      ru,
    },
  })

export default i18n
