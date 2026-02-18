import { defineConfig } from "tsup";

const isWatch = process.argv.includes("--watch");

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  dts: isWatch
    ? false
    : {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@json-render/core": ["../core/dist"],
            "@json-render/core/*": ["../core/dist/*"],
          },
        },
      },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "remotion", "@json-render/core", "zod"],
});
