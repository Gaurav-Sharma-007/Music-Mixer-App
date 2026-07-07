const { spawn } = require("child_process");
const electron = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const hasOzonePlatform = args.some((arg) => arg.startsWith("--ozone-platform"));
const linuxDisplayArgs =
  process.platform === "linux" && !hasOzonePlatform ? ["--ozone-platform=x11"] : [];

const child = spawn(electron, [...linuxDisplayArgs, ...args, "."], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
