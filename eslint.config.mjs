import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 */
const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    name: "project/conventions",
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Ground rule 1: no `any`.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Keeps type-only imports erased at build time.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Ground rule 4: every class member states its visibility.
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { accessibility: "explicit", overrides: { constructors: "no-public" } },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  /**
   * These make the "forbidden imports" table executable rather than advisory.
   */
  {
    name: "project/layer-boundaries/services-and-controllers",
    files: ["src/server/modules/**/*.service.ts", "src/server/modules/**/*.controller.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message:
                "Services and controllers must not touch the ODM. Go through a repository (D-05).",
            },
            {
              name: "next/server",
              message:
                "Services and controllers must stay transport-agnostic. HTTP belongs in the route composer.",
            },
          ],
          patterns: [
            {
              group: ["**/database/models/*", "@/server/database/models/*"],
              message: "Models are reachable only from repositories (D-05).",
            },
          ],
        },
      ],
    },
  },
  {
    name: "project/layer-boundaries/client-cannot-import-server",
    files: ["src/client/**/*.ts", "src/client/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "**/server/config/env*"],
              message:
                "Client code must never import server modules — env.ts reads secrets and would be bundled.",
            },
          ],
        },
      ],
    },
  },

  // Test scripts legitimately reach into any layer and print to stdout.
  {
    name: "project/scripts",
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "no-restricted-imports": "off",
    },
  },

  // Must stay last: turns off every rule Prettier owns.
  prettier,
]);

export default eslintConfig;
