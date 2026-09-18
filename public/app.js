const mediaInput = document.getElementById("media");
const fileName = document.getElementById("fileName");
const startButton = document.getElementById("start");
const statusText = document.getElementById("status");
const bar = document.getElementById("bar");

const result = document.getElementById("result");
const srtLink = document.getElementById("srt");
const vttLink = document.getElementById("vtt");
const videoLink = document.getElementById("video");

mediaInput.addEventListener("change", () => {
  const file = mediaInput.files[0];

  if (!file) {
    fileName.textContent = "Video / Audio ဖိုင်ရွေးပါ";
    return;
  }

  fileName.textContent = file.name;
  statusText.textContent = "ဖိုင်ရွေးပြီးပါပြီ။ Start ကိုနှိပ်ပါ။";
});

startButton.addEventListener("click", async () => {
  const file = mediaInput.files[0];

  if (!file) {
    statusText.textContent = "⚠️ Video / Audio ဖိုင်အရင်ရွေးပါ။";
    return;
  }

  startButton.disabled = true;
  result.classList.add("hidden");

  setProgress(10);
  statusText.textContent = "📤 ဖိုင်ကို Server သို့ ပို့နေပါတယ်...";

  try {
    const formData = new FormData();

    formData.append("media", file);

    const response = await fetch("/api/jobs", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Upload failed."
      );
    }

    setProgress(25);

    statusText.textContent =
      "🤖 AI က Video ကို စစ်ဆေးပြီး စာတန်းထုတ်နေပါတယ်...";

    await checkJob(data.project_id);

  } catch (error) {
    console.error(error);

    statusText.textContent =
      "❌ အမှားဖြစ်ပါတယ်: " + error.message;

    setProgress(0);

    startButton.disabled = false;
  }
});

async function checkJob(jobId) {
  try {
    const response = await fetch(
      `/api/jobs/${jobId}`
    );

    const job = await response.json();

    if (!response.ok) {
      throw new Error(
        job.error || "Job status error."
      );
    }

    updateStatus(job);

    if (job.status === "completed") {
      showResult(job);
      return;
    }

    if (job.status === "failed") {
      throw new Error(
        job.error || "AI subtitle failed."
      );
    }

    setTimeout(() => {
      checkJob(jobId);
    }, 3000);

  } catch (error) {
    console.error(error);

    statusText.textContent =
      "❌ " + error.message;

    setProgress(0);

    startButton.disabled = false;
  }
}

function updateStatus(job) {
  switch (job.status) {

    case "pending":
      setProgress(20);
      statusText.textContent =
        "⏳ စောင့်ဆိုင်းနေပါတယ်...";
      break;

    case "uploading_to_ai":
      setProgress(30);
      statusText.textContent =
        "📤 AI Server သို့ Upload လုပ်နေပါတယ်...";
      break;

    case "processing_video":
      setProgress(45);
      statusText.textContent =
        "🎬 Video ကို AI က Processing လုပ်နေပါတယ်...";
      break;

    case "transcribing":
      setProgress(65);
      statusText.textContent =
        "🎙️ အသံကို စာသားအဖြစ် ပြောင်းနေပါတယ်...";
      break;

    case "creating_subtitles":
      setProgress(85);
      statusText.textContent =
        "🇲🇲 မြန်မာစာတန်းထိုး ဖန်တီးနေပါတယ်...";
      break;

    default:
      setProgress(25);
      statusText.textContent =
        "🤖 AI လုပ်ဆောင်နေပါတယ်...";
  }
}

function showResult(job) {
  setProgress(100);

  statusText.textContent =
    "✅ မြန်မာစာတန်းထိုး အောင်မြင်စွာ ပြီးပါပြီ။";

  result.classList.remove("hidden");

  if (job.final_srt_url) {
    srtLink.href = job.final_srt_url;
    srtLink.classList.remove("hidden");
  }

  if (job.final_vtt_url) {
    vttLink.href = job.final_vtt_url;
    vttLink.classList.remove("hidden");
  }

  if (job.final_video_url) {
    videoLink.href = job.final_video_url;
    videoLink.classList.remove("hidden");
  }

  startButton.disabled = false;
}

function setProgress(value) {
  bar.style.width = `${value}%`;
}
