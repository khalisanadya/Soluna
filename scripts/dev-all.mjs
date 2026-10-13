// Menjalankan mesin hitung (FastAPI) dan aplikasi web (Next.js) bersamaan.
import { spawn } from "node:child_process";

const opts = { stdio: "inherit", shell: true };
const procs = [spawn("node scripts/run-engine.mjs", opts), spawn("npx next dev", opts)];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", stop));
