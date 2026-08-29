// إعداد ESLint بصيغة flat config.
// ملاحظة: أمر `next lint` أُزيل في Next.js 16، لذلك نستدعي eslint مباشرة
// عبر السكربت `npm run lint`.

import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  {
    rules: {
      // نستخدم بادئة الشرطة السفلية للمتغيرات المتجاهلة عمدًا
      // (مثل حذف الإجابة الصحيحة من السؤال قبل إرساله للطالب)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
