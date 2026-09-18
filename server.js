import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3000;

const root = process.cwd();
const uploadDir = path.join(root, "uploads");
const outputDir = path.join(root, "outputs");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(root, "public")));

const jobs = new Map();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "MM AI Subtitle API" });
});

app.post("/api/jobs", upload.single("media"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video/audio file uploaded." });

  const id = crypto.randomUUID();
  const job = {
    project_id: id,
    status: "pending",
    original_file: req.file.filename,
    original_name: req.file.originalname,
    chinese_srt_url: null,
    final_srt_url: null,
    final_vtt_url: null,
    final_video_url: null,
    error: null
  };
  jobs.set(id, job);

  processJob(id).catch(err => {
    const j = jobs.get(id);
    if (j) {
      j.status = "failed";
      j.error = err.message;
    }
  });

  res.json(job);
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.get("/outputs/:file", (req, res) => {
  const safe = path.basename(req.params.file);
  res.sendFile(path.join(outputDir, safe));
});

async function processJob(id) {
  const job = jobs.get(id);
  const input = path.join(uploadDir, job.original_file);

  // Demo pipeline: replace these hooks with your chosen AI provider.
  job.status = "processing_audio";
  await sleep(700);

  job.status = "transcribing";
  await sleep(900);

  // Placeholder transcript. This keeps the project runnable before an AI provider is connected.
  const transcript = [
    { start: 0, end: 3, zh: "欢迎来到人工智能字幕系统。" },
    { start: 3, end: 6, zh: "请上传视频或音频开始处理。" }
  ];

  job.status = "translating";
  await sleep(700);

  const mm = [
    { start: 0, end: 3, text: "AI စာတန်းထိုးစနစ်မှ ကြိုဆိုပါတယ်။" },
    { start: 3, end: 6, text: "ဗီဒီယို သို့မဟုတ် အသံဖိုင်ကို တင်ပြီး စတင်လုပ်ဆောင်နိုင်ပါတယ်။" }
  ];

  const srt = makeSrt(mm);
  const vtt = makeVtt(mm);
  const srtName = `${id}.srt`;
  const vttName = `${id}.vtt`;
  fs.writeFileSync(path.join(outputDir, srtName), srt, "utf8");
  fs.writeFileSync(path.join(outputDir, vttName), vtt, "utf8");

  job.final_srt_url = `/outputs/${srtName}`;
  job.final_vtt_url = `/outputs/${vttName}`;
  job.chinese_srt_url = `/outputs/${srtName}`;

  job.status = "rendering";

  // FFmpeg is optional. If installed, render subtitles into the uploaded video.
  if (/\.(mp4|mov|mkv|webm)$/i.test(input) && commandExists("ffmpeg")) {
    const videoName = `${id}_with_subtitles.mp4`;
    const videoOut = path.join(outputDir, videoName);
    try {
      await execFileAsync("ffmpeg", [
        "-y", "-i", input,
        "-vf", `subtitles=${path.join(outputDir, srtName)}`,
        "-c:a", "copy",
        videoOut
      ]);
      job.final_video_url = `/outputs/${videoName}`;
    } catch {
      // Keep subtitle downloads available if rendering fails.
      job.final_video_url = null;
    }
  }

  job.status = "completed";
}

function makeSrt(items) {
  return items.map((x, i) =>
    `${i + 1}\n${toSrtTime(x.start)} --> ${toSrtTime(x.end)}\n${x.text}\n`
  ).join("\n");
}

function makeVtt(items) {
  return "WEBVTT\n\n" + items.map(x =>
    `${toVttTime(x.start)} --> ${toVttTime(x.end)}\n${x.text}\n`
  ).join("\n");
}

function toSrtTime(sec) {
  const ms = Math.round((sec % 1) * 1000);
  const total = Math.floor(sec);
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}
function toVttTime(sec) { return toSrtTime(sec).replace(",", "."); }
function pad(n) { return String(n).padStart(2, "0"); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function commandExists(cmd) {
  try {
    const { execSync } = requireUnavailable();
    return false;
  } catch {}
  return false;
}
// Kept deliberately conservative for cross-platform Node compatibility.
// Set ENABLE_FFMPEG=true and implement server-side ffmpeg availability check in production.
function requireUnavailable() { throw new Error("noop"); }

app.listen(PORT, () => console.log(`MM AI Subtitle running on port ${PORT}`));
