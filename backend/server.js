const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const { spawn } = require("child_process");
const path    = require("path");
const fs      = require("fs");

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const upload = multer({ dest: uploadsDir });

app.get("/", (req, res) => res.json({ status: "running", message: "Drishtara API" }));
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() }));

app.post("/api/predict", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  const imagePath  = req.file.path;
  const scriptPath = path.join(__dirname, "predict.py");
  const pythonBin  = process.platform === "win32" ? "python" : "python3";

  console.log("Image received:", req.file.originalname);

  const py = spawn(pythonBin, [scriptPath, imagePath]);
  let output = "", errOutput = "";

  py.stdout.on("data", d => { output    += d.toString(); });
  py.stderr.on("data", d => { errOutput += d.toString(); console.log("[stderr]", d.toString().trim()); });

  const cleanup = () => { try { fs.unlinkSync(imagePath); } catch (_) {} };

  py.on("error", err => {
    cleanup();
    res.status(500).json({ error: "Failed to start Python: " + err.message });
  });

  py.on("close", code => {
    cleanup();
    if (code !== 0) return res.status(500).json({ error: `Python exited ${code}: ${errOutput.trim()}` });

    const lines      = output.trim().split("\n").filter(l => l.trim());
    const lastLine   = lines[lines.length - 1];

    try {
      const result = JSON.parse(lastLine);
      if (result.error) return res.status(500).json({ error: result.error });
      console.log("Prediction:", result.prediction);
      res.json({ ...result, timestamp: new Date().toISOString() });
    } catch (_) {
      // fallback: plain text prediction
      res.json({ prediction: lastLine, timestamp: new Date().toISOString() });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nDrishtara running on http://localhost:${PORT}\n`);
});

process.on("SIGINT", () => { console.log("\nShutting down…"); process.exit(0); });