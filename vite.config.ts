import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      tsr: {
        appDirectory: "src",
      },
      server: {
        preset: "vercel",
      },
    }),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
