const hmr = document.createElement("script");
hmr.src = "/modules/session-report/@vite/client";
hmr.type = "module";
document.head.prepend(hmr);

const lib = document.createElement("script");
lib.src = "/modules/session-report/src/session-report.ts";
lib.type = "module";
document.head.appendChild(lib);
