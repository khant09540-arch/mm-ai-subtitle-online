const media = document.getElementById("media");
const fileName = document.getElementById("fileName");
const start = document.getElementById("start");
const bar = document.getElementById("bar");
const statusText = document.getElementById("status");

const result = document.getElementById("result");
const srtLink = document.getElementById("srt");
const vttLink = document.getElementById("vtt");
const videoLink = document.getElementById("video");

media.addEventListener("change", () => {
    if (media.files.length > 0) {
        fileName.textContent = media.files[0].name;
        statusText.textContent = "ဖိုင်ရွေးပြီးပါပြီ။ AI Subtitle စတင်နိုင်ပါပြီ။";
    } else {
        fileName.textContent = "Video / Audio ရွေးပါ";
    }
});

start.addEventListener("click", async () => {

    if (!media.files.length) {
        statusText.textContent = "Video / Audio ဖိုင်တစ်ခု ရွေးပေးပါ။";
        return;
    }

    const file = media.files[0];

    const formData = new FormData();
    formData.append("media", file);

    start.disabled = true;
    bar.style.width = "10%";
    statusText.textContent = "ဖိုင် Upload လုပ်နေပါတယ်...";

    try {

        const response = await fetch("/api/process", {
            method: "POST",
            body: formData
        });

        bar.style.width = "40%";
        statusText.textContent = "AI Subtitle ပြုလုပ်နေပါတယ်...";

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        bar.style.width = "100%";

        if (data.status === "completed" || data.status === "success") {

            statusText.textContent = "Subtitle ပြီးပါပြီ။";

            result.classList.remove("hidden");

            if (data.final_srt_url) {
                srtLink.href = data.final_srt_url;
                srtLink.classList.remove("hidden");
            }

            if (data.final_vtt_url) {
                vttLink.href = data.final_vtt_url;
                vttLink.classList.remove("hidden");
            }

            if (data.final_video_url) {
                videoLink.href = data.final_video_url;
                videoLink.classList.remove("hidden");
            }

        } else {

            statusText.textContent =
                data.message || "Subtitle ပြုလုပ်မှု မအောင်မြင်ပါ။";
        }

    } catch (error) {

        console.error(error);

        bar.style.width = "0%";

        statusText.textContent =
            "Server နှင့် ချိတ်ဆက်၍ မရသေးပါ။";
    }

    start.disabled = false;
});
