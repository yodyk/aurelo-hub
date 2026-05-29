import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Formatter guardrail — route all numeric/temporal formatting through
      // src/lib/format.ts so precision tiers and locale stay consistent.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "MemberExpression[property.name='toFixed']",
          message: "Use formatMoney/formatPercent/formatDuration from '@/lib/format' instead of toFixed().",
        },
        {
          selector: "MemberExpression[object.name='Intl'][property.name='NumberFormat']",
          message: "Use formatters from '@/lib/format' instead of raw Intl.NumberFormat.",
        },
      ],
    },
  },
  {
    // The formatter module is the single source of truth — exempt it.
    files: ["src/lib/format.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
);
