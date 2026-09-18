import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const app = express();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not configured.");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});

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

  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

app.use(express.json());

app.use(
  express.static(path.join(root, "public"))
);

const jobs = new Map();


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "MM AI Subtitle API",
    gemini: Boolean(GEMINI_API_KEY)
  });
});


/* =========================
   CREATE JOB
========================= */

app.post(
  "/api/jobs",
  upload.single("media"),
  async (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: "No video/audio file uploaded."
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on server."
      });
    }

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

    processJob(id).catch((err) => {

      console.error("JOB ERROR:", err);

      const j = jobs.get(id);

      if (j) {
        j.status = "failed";
        j.error = err.message;
      }

    });

    res.json(job);
  }
);


/* =========================
   GET JOB
========================= */

app.get(
  "/api/jobs/:id",
  (req, res) => {

    const job = jobs.get(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: "Job not found"
      });
    }

    res.json(job);
  }
);


/* =========================
   DOWNLOAD OUTPUT
========================= */

app.get(
  "/outputs/:file",
  (req, res) => {

    const safe = path.basename(req.params.file);

    const filePath = path.join(
      outputDir,
      safe
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "File not found"
      });
    }

    res.sendFile(filePath);
  }
);


/* =========================
   PROCESS VIDEO
========================= */

async function processJob(id) {

  const job = jobs.get(id);

  if (!job) {
    throw new Error("Job not found");
  }

  const input = path.join(
    uploadDir,
    job.original_file
  );


  /* -------------------------
     STEP 1
  ------------------------- */

  job.status = "uploading_to_ai";


  const mimeType = getMimeType(
    job.original_name
  );

  console.log("Uploading:", input);
  console.log("MIME:", mimeType);


  const uploadedFile = await ai.files.upload({
    file: input,

    config: {
      mimeType
    }
  });


  console.log(
    "Gemini file:",
    uploadedFile.name
  );


  /* -------------------------
     STEP 2
     WAIT FOR VIDEO PROCESSING
  ------------------------- */

  job.status = "processing_video";

  let videoFile = uploadedFile;


  while (
    videoFile.state &&
    getStateName(videoFile.state) === "PROCESSING"
  ) {

    await sleep(3000);

    videoFile = await ai.files.get({
      name: videoFile.name
    });

    console.log(
      "File state:",
      getStateName(videoFile.state)
    );
  }


  const finalState =
    getStateName(videoFile.state);


  if (
    finalState &&
    finalState !== "ACTIVE"
  ) {

    throw new Error(
      `Gemini file processing failed: ${finalState}`
    );
  }


  /* -------------------------
     STEP 3
     AI TRANSCRIPTION
  ------------------------- */

  job.status = "transcribing";


  const prompt = `
You are a professional subtitle translator.

Analyze the uploaded video carefully.

The spoken language may be Chinese or English.

Listen to the actual speech in the video.

Create accurate subtitle segments based on the speech.

Translate the spoken dialogue into natural Myanmar (Burmese).

Important rules:

1. Do NOT invent dialogue.
2. Do NOT summarize.
3. Keep the original meaning.
4. Preserve the order of speech.
5. Create accurate start and end timestamps.
6. Split long dialogue into readable subtitle segments.
7. Each subtitle should normally be around 1-2 short sentences.
8. Return ONLY JSON.
9. No markdown.
10. No explanation.

JSON format:

[
  {
    "start": 0,
    "end": 3,
    "text": "မြန်မာဘာသာပြန်စာ"
  }
]

start and end must be seconds as numbers.
`;


  const response =
    await ai.models.generateContent({

      model: "gemini-3.8-flash",

      contents: [
        {
          role: "user",

          parts: [

            {
              fileData: {
                fileUri: videoFile.uri,
                mimeType: videoFile.mimeType
              }
            },

            {
              text: prompt
            }

          ]
        }
      ],

      config: {

        responseMimeType: "application/json",

        responseSchema: {
          type: "array",

          items: {

            type: "object",

            properties: {

              start: {
                type: "number"
              },

              end: {
                type: "number"
              },

              text: {
                type: "string"
              }

            },

            required: [
              "start",
              "end",
              "text"
            ]
          }
        }
      }

    });


  /* -------------------------
     STEP 4
     READ AI RESULT
  ------------------------- */

  job.status = "creating_subtitles";


  const aiText = response.text;

  console.log(
    "Gemini response:",
    aiText
  );


  let subtitles;


  try {

    subtitles =
      JSON.parse(aiText);

  } catch (error) {

    throw new Error(
      "Gemini returned invalid subtitle JSON."
    );
  }


  if (!Array.isArray(subtitles)) {

    throw new Error(
      "Invalid subtitle data."
    );
  }


  subtitles =
    subtitles
      .map((item) => ({

        start:
          Number(item.start),

        end:
          Number(item.end),

        text:
          String(item.text || "").trim()

      }))

      .filter(
        (item) =>
          Number.isFinite(item.start) &&
          Number.isFinite(item.end) &&
          item.end > item.start &&
          item.text
      );


  if (subtitles.length === 0) {

    throw new Error(
      "No subtitles were generated."
    );
  }


  /* -------------------------
     STEP 5
     CREATE SRT
  ------------------------- */

  const srt =
    makeSrt(subtitles);

  const vtt =
    makeVtt(subtitles);


  const srtName =
    `${id}.srt`;

  const vttName =
    `${id}.vtt`;


  fs.writeFileSync(
    path.join(outputDir, srtName),
    srt,
    "utf8"
  );


  fs.writeFileSync(
    path.join(outputDir, vttName),
    vtt,
    "utf8"
  );


  job.final_srt_url =
    `/outputs/${srtName}`;

  job.final_vtt_url =
    `/outputs/${vttName}`;


  job.chinese_srt_url =
    `/outputs/${srtName}`;


  /* -------------------------
     DONE
  ------------------------- */

  job.status = "completed";

  console.log(
    "JOB COMPLETED:",
    id
  );
}


/* =========================
   MIME TYPE
========================= */

function getMimeType(filename) {

  const ext =
    path.extname(filename)
      .toLowerCase();


  const types = {

    ".mp4": "video/mp4",

    ".mov": "video/quicktime",

    ".mkv": "video/x-matroska",

    ".webm": "video/webm",

    ".avi": "video/x-msvideo",

    ".mp3": "audio/mpeg",

    ".wav": "audio/wav",

    ".m4a": "audio/mp4",

    ".aac": "audio/aac",

    ".ogg": "audio/ogg",

    ".flac": "audio/flac"

  };


  return (
    types[ext] ||
    "application/octet-stream"
  );
}


/* =========================
   STATE
========================= */

function getStateName(state) {

  if (!state) {
    return "";
  }


  if (typeof state === "string") {
    return state;
  }


  if (state.name) {
    return state.name;
  }


  return String(state);
}


/* =========================
   SRT
========================= */

function makeSrt(items) {

  return items
    .map((x, i) => {

      return `${i + 1}
${toSrtTime(x.start)} --> ${toSrtTime(x.end)}
${x.text}
`;

    })
    .join("\n");
}


/* =========================
   VTT
========================= */

function makeVtt(items) {

  return (
    "WEBVTT\n\n" +

    items
      .map((x) => {

        return `${toVttTime(x.start)} --> ${toVttTime(x.end)}
${x.text}
`;

      })
      .join("\n")
  );
}


/* =========================
   TIME
========================= */

function toSrtTime(sec) {

  sec = Math.max(
    0,
    Number(sec) || 0
  );


  const ms =
    Math.round(
      (sec % 1) * 1000
    );


  const total =
    Math.floor(sec);


  const s =
    total % 60;


  const m =
    Math.floor(total / 60) % 60;


  const h =
    Math.floor(total / 3600);


  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}


function toVttTime(sec) {

  return toSrtTime(sec)
    .replace(",", ".");
}


function pad(n) {

  return String(n)
    .padStart(2, "0");
}


/* =========================
   SLEEP
========================= */

function sleep(ms) {

  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `MM AI Subtitle running on port ${PORT}`
    );

  }
);
