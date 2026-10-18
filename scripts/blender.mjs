// Runs art/blender/side-a/device.py in headless Blender with the given pass options
// (e.g. `node scripts/blender.mjs --only glb`). Spawned directly, not through a shell, so
// the path with spaces survives on Windows. BLENDER overrides where Blender lives.
import { spawnSync } from "node:child_process";

const blender = process.env.BLENDER ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const args = ["-b", "--factory-startup", "-P", "art/blender/side-a/device.py", "--", ...process.argv.slice(2)];
const { status, error } = spawnSync(blender, args, { stdio: "inherit" });
if (error) throw error;
process.exit(status ?? 1);
