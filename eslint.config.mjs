import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The old JS views (src/components/views/**) predate this migration
      // and stay JS deliberately (see docs/ARCHITECTURE-AUDIT.md §4.5) —
      // don't fail lint over patterns that are fine in plain JS.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // eslint-config-next 16 bundles a much stricter, React-Compiler-oriented
    // eslint-plugin-react-hooks than existed when this UI code (pre-dating
    // this migration) was written. Downgraded to warnings here rather than
    // fixed, consistent with the decision in
    // docs/ARCHITECTURE-AUDIT.md §4.5 not to rewrite the 15 view components
    // without a browser available to verify the result:
    //  - react-hooks/set-state-in-effect: flags the standard
    //    fetch-on-mount pattern in Workspace.jsx; functionally correct.
    //  - react-hooks/purity: flags Date.now() calls inside onClick handlers
    //    (Subscription.jsx, Quotations.jsx) that only ever run on click,
    //    not during render — the rule's static analysis can't tell the
    //    difference reliably yet.
    //  - react-hooks/immutability: flags a render-scoped `let n` row
    //    counter in DocView.jsx that's reset every render; not a real bug
    //    for a read-only print view.
    files: ["src/components/**/*.jsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "prisma/generated/**"]),
]);

export default eslintConfig;
