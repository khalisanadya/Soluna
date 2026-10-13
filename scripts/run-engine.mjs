// Menjalankan mesin hitung FastAPI dengan Python dari engine/.venv (Windows/macOS/Linux).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const engineDir = path.resolve(import.meta.dirname, "..", "engine");
const win = process.platform === "win32";
const venvPython = path.join(engineDir, ".venv", win ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venvPython) ? venvPython : win ? "python" : "python3";

const args = process.argv.slice(2);
const cmd = args[0] === "test" ? ["-m", "pytest", "-q"] : ["-m", "uvicorn", "main:app", "--port", process.env.ENGINE_PORT ?? "8000", "--reload"];

const child = spawn(python, cmd, { cwd: engineDir, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
