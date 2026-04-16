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

// 🎤 録音開始
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
    document.getElementById("live").innerText = "録音中...";

  } catch {
    alert("マイクが使えません");
  }
}

// 🛑 停止
function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
}

// 🎧 Whisper
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

  } catch {
    document.getElementById("live").innerText = "エラーが発生しました";
  }
}

// 💾 保存（話者分離）
async function saveCurrent() {
  if (!currentText.trim()) return;

  const title = document.getElementById("title").value || "無題";

  let diarized = currentText;

  try {
    diarized = await diarize(formatText(currentText));
  } catch {}

  const item = {
    title,
    content: diarized,
    date: new Date().toLocaleString()
  };

  history.unshift(item);
  if (history.length > 10) history.pop();

  localStorage.setItem("history", JSON.stringify(history));
  updateHistory();

  document.getElementById("live").innerText = "";
  document.getElementById("title").value = "";
}

// 📜 履歴
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

// 📄 詳細画面
function openDetail(i) {
  document.getElementById("app").style.display = "none";
  document.getElementById("detailPage").style.display = "block";

  const h = history[i];

  window.currentDetailIndex = i;
  window.originalText = h.content;

  document.getElementById("detailText").innerText =
    "【" + h.title + "】\n\n" + h.content;

  createSpeakerEditor(h.content);
}

// 🔙 戻る
function goBack() {
  document.getElementById("detailPage").style.display = "none";
  document.getElementById("app").style.display = "block";
}

// 👥 話者編集UI生成
function createSpeakerEditor(text) {
  const container = document.getElementById("speakerEditor");
  container.innerHTML = "<h3>話者名編集</h3>";

  const speakers = [...new Set(text.match(/話者[A-Z]/g) || [])];

  speakers.forEach(s => {
    const div = document.createElement("div");

    const label = document.createElement("span");
    label.innerText = s + " → ";

    const input = document.createElement("input");
    input.placeholder = "名前入力";
    input.id = "map_" + s;

    div.appendChild(label);
    div.appendChild(input);

    container.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.innerText = "適用";
  btn.onclick = applySpeakerNames;

  container.appendChild(btn);
}

// 👥 名前適用
function applySpeakerNames() {
  let text = window.originalText;

  const speakers = [...new Set(text.match(/話者[A-Z]/g) || [])];

  speakers.forEach(s => {
    const input = document.getElementById("map_" + s);
    if (input && input.value.trim()) {
      const name = input.value.trim();
      text = text.replace(new RegExp(s, "g"), name);
    }
  });

  document.getElementById("detailText").innerText = text;

  history[window.currentDetailIndex].content = text;
  localStorage.setItem("history", JSON.stringify(history));
}

// 🔍 検索
async function searchText() {
  const key = document.getElementById("search").value.trim();
  if (!key) return;

  const titleMatch = history.find(h => h.title.includes(key));

  try {
    if (titleMatch) {
      const summary = await summarize(titleMatch.content);
      document.getElementById("result").innerText = summary;
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
    document.getElementById("result").innerText = summary;

  } catch {
    document.getElementById("result").innerText = "要約に失敗しました";
  }
}

// 🧠 整形
function formatText(text) {
  return text
    .replace(/\n+/g, " ")
    .replace(/。/g, "。\n")
    .replace(/！/g, "！\n")
    .replace(/？/g, "？\n")
    .replace(/\s+/g, " ")
    .trim();
}

// 👥 話者分離
async function diarize(text) {
  const res = await fetch("/api/diarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  return data.result || text;
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
