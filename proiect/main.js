const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let pyProc = null;

function startPythonBackend() {
  const backendDir = path.join(__dirname, "backend");

  const pythonExe = ".venv\\Scripts\\python.exe";

  pyProc = spawn(
    pythonExe,
    ["-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8001"],
    { cwd: backendDir }
  );

  pyProc.stdout.on("data", (data) => console.log("[py]", data.toString()));
  pyProc.stderr.on("data", (data) => console.error("[py]", data.toString()));
}

function stopPythonBackend() {
  if (pyProc) {
    pyProc.kill();
    pyProc = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  win.loadFile(path.join(__dirname, "frontend", "index.html"));
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  stopPythonBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", stopPythonBackend);
