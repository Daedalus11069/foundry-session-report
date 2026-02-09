import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";
import Components from "unplugin-vue-components/vite";
import { PrimeVueResolver } from "@primevue/auto-import-resolver";
import ModuleData from "./module.json";
import { writeFileSync } from "fs";
import { resolve } from "path";

// Custom logger to suppress CSS sourcemap warnings
const consoleWarn = console.warn;
console.warn = function filterWarnings(msg, ...args) {
  const suppressedWarnings = ["Sourcemap is likely to be incorrect"];
  if (suppressedWarnings.some(entry => msg?.includes?.(entry))) {
    return;
  }
  consoleWarn(msg, ...args);
};

export default defineConfig(({ mode }) => ({
  // root: "src/", // Source location / esbuild root
  base: `/modules/${ModuleData.id}/`, // Base module path that 30001 / served dev directory.
  // publicDir: resolve(__dirname + "public"), // No public resources to copy.
  resolve: {
    conditions: ["import", "browser"],
    alias: {
      "@": "./src"
    }
  },

  esbuild: {
    target: ["es2022"]
  },

  css: {
    // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
    // postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS })
    devSourcemap: true
  },

  define: {
    "process.env": {}
  },

  server: {
    port: 30001,
    proxy: {
      // Serves static files from main Foundry server.
      [`^/(modules/${ModuleData.id}/(images|assets|lang|packs|style\\.css))`]:
        "http://localhost:30000",

      // // All other paths besides package ID path are served from main Foundry server.
      [`^/(?!` +
      [
        `modules/${ModuleData.id}/@vite\\/client`,
        `modules/${ModuleData.id}/@id`,
        `modules/${ModuleData.id}/.*?/env.mjs$`,
        `modules/${ModuleData.id}/node_modules/.vite/.*`,
        `modules/${ModuleData.id}/src/`,
        `/${ModuleData.id}/`
      ].join("|") +
      ")"]: "http://localhost:30000",

      // Enable socket.io from main Foundry server.
      "/socket.io": { target: "ws://localhost:30000", ws: true }
    }
  },

  // Necessary when using the dev server for top-level await usage inside of TRL.
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022"
    }
  },

  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: "src/session-report.ts",
      formats: ["es"],
      fileName: format => "session-report.js",
      cssFileName: "styles/session-report"
    },
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: assetInfo => {
          if (assetInfo.name === "style.css") return "session-report.css";
          return assetInfo.name || "";
        }
      }
    }
  },
  plugins: [
    vue(),
    {
      name: "vite-plugin-system-json",
      closeBundle() {
        // Read the manifest to get hashed filenames
        const manifestPath = resolve(__dirname, "dist/.vite/manifest.json");
        let jsFile = "session-report.js";
        let cssFile = "styles/session-report.css";

        // try {
        //   const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        //   // Find the main entry file
        //   const entry = manifest["src/session-report.ts"];
        //   if (entry) {
        //     jsFile = entry.file;
        //     // Check if CSS is embedded in entry (older Vite) or separate (newer Vite)
        //     if (entry.css && entry.css.length > 0) {
        //       cssFile = entry.css[0];
        //     }
        //   }
        //   // Check for separate style.css entry (Vite 7.x with assetFileNames)
        //   const styleEntry = manifest["style.css"];
        //   if (styleEntry && styleEntry.file) {
        //     cssFile = styleEntry.file;
        //   }
        // } catch (e) {
        //   console.warn(
        //     "Could not read manifest, using default filenames:",
        //     e.message
        //   );
        // }

        // Build system.json with hashed filenames
        const moduleJson = { ...ModuleData } as { [key: string]: any };
        delete moduleJson.scripts;
        moduleJson.esmodules = [jsFile];
        moduleJson.styles = [cssFile];

        // Write module.json
        const outputPath = resolve(__dirname, "dist/module.json");
        writeFileSync(outputPath, JSON.stringify(moduleJson, null, 2));
        console.log(`Generate File to ${outputPath}`);
      }
    },
    ...(mode === "production"
      ? [
          viteStaticCopy({
            targets: [
              // { src: "src/templates", dest: "" },
              { src: "lang", dest: "" }
              // { src: "packs", dest: "" }
            ]
          })
        ]
      : []), // No static copy in dev mode.
    Components({
      resolvers: [PrimeVueResolver()]
    })
  ]
}));
