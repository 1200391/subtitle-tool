// 🔐 パスワード
const PASSWORD = "Spoon";

function unlock() {
  if (document.getElementById("pass").value === PASSWORD) {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
  }
}

// 📦 履歴
let history = JSON.parse(localStorage.getItem("history")) || [];

// 🎤 録音
let mediaRecorder;
let audioChunks = [];
let currentText = "";

// 🎤 録音開始（画面＋音声）
async function startRecording() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  });

  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => {
    audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });

    document.getElementById("live").innerText = "文字起こし中...";

    await sendAudio(blob);
  };

  mediaRecorder.start();
}

// 🛑 録音終了
function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
}

// 🎧 Whisper送信
async function sendAudio(blob) {
  try {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    currentText = data.text || "文字起こし失敗";

    document.getElementById("live").innerText = currentText;

  } catch (e) {
    console.error(e);
    document.getElementById("live").innerText = "エラーが発生しました";
  }
}

// 💾 保存
async function saveCurrent() {
  if (!currentText.trim()) return;

  const title = document.getElementById("title").value || "無題";

  const item = {
    title,
    content: currentText,
    date: new Date().toLocaleString()
  };

  history.unshift(item);
  if (history.length > 10) history.pop();

  localStorage.setItem("history", JSON.stringify(history));

  updateHistory();

  document.getElementById("live").innerText = "";
  document.getElementById("title").value = "";
}

// 📜 履歴表示
function updateHistory() {
  const el = document.getElementById("history");
  el.innerHTML = "";

  history.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerText = `${h.title} | ${h.date}`;
    div.onclick = () => openDetail(i);
    el.appendChild(div);
  });
}

// 📄 詳細
function openDetail(i) {
  document.getElementById("app").style.display = "none";
  document.getElementById("detailPage").style.display = "block";

  const h = history[i];

  document.getElementById("detailText").innerText =
    "【" + h.title + "】\n\n" + formatText(h.content);
}

// 🔙 戻る
function goBack() {
  document.getElementById("detailPage").style.display = "none";
  document.getElementById("app").style.display = "block";
}

// 🔍 検索
async function searchText() {
  const key = document.getElementById("search").value.trim();
  if (!key) return;

  const titleMatch = history.find(h => h.title.includes(key));

  try {
    if (titleMatch) {
      const summary = await summarize(titleMatch.content);
      document.getElementById("result").innerText =
        summary || "要約できませんでした";
      return;
    }

    const texts = history
      .filter(h => h.content.includes(key))
      .map(h => h.content)
      .join("\n");

    if (!texts) {
      document.getElementById("result").innerText = "該当なし";
      return;
    }

    const summary = await summarize(texts);

    document.getElementById("result").innerText =
      summary || "要約できませんでした";

  } catch (e) {
    console.error(e);
    document.getElementById("result").innerText = "要約に失敗しました";
  }
}

// 🧠 句読点補正
function formatText(text) {
  return text
    .replace(/\n+/g, " ")
    .replace(/。/g, "。\n")
    .replace(/！/g, "！\n")
    .replace(/？/g, "？\n")
    .replace(/\s+/g, " ")
    .trim();
}

// 🧠 要約
async function summarize(text) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  return data.result || "要約できませんでした";
}

// 🚀 初期化
window.onload = updateHistory;
