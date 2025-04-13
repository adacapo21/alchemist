import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    extends: [eslintConfigPrettier],
    rules: {
      "prettier/prettier": "error",
    },
  },
];
