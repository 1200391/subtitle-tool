const PASSWORD = "Spoon";

function unlock() {
  if (document.getElementById("pass").value === PASSWORD) {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
  }
}

let history = JSON.parse(localStorage.getItem("history")) || [];
let recognition;
let currentText = "";

// 🎤 録音
function startRecording() {
  currentText = "";

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();

  recognition.lang = "ja-JP";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (e) => {
    let interim = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      let t = e.results[i][0].transcript;

      if (e.results[i].isFinal) currentText += t + "\n";
      else interim += t;
    }

    const live = document.getElementById("live");
    live.innerText = currentText + "\n" + interim;

    // 🔥 中央に来るスクロール
    setTimeout(() => {
      live.scrollTop = live.scrollHeight / 2;
    }, 0);
  };

  recognition.start();
}

function stopRecording() {
  if (recognition) recognition.stop();
}

// 💾 保存
async function saveCurrent() {
  if (!currentText.trim()) return;

  const title = document.getElementById("title").value || "無題";

  let diarized = currentText;
  let summary = "（要約失敗）";

  try { diarized = await diarize(currentText); } catch {}
  try { summary = await summarize(diarized); } catch {}

  const item = {
    title,
    content: diarized,
    summary,
    date: new Date().toLocaleString()
  };

  history.unshift(item);
  if (history.length > 10) history.pop();

  localStorage.setItem("history", JSON.stringify(history));

  updateHistory();

  document.getElementById("live").innerText = "";
  document.getElementById("title").value = "";
}

// 📜 履歴（1行表示）
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

  document.getElementById("detailText").innerText =
    "【要約】\n" + h.summary + "\n\n" + h.content;
}

function goBack() {
  document.getElementById("detailPage").style.display = "none";
  document.getElementById("app").style.display = "block";
}

// 🔍 検索＋要約
async function searchText() {
  const key = document.getElementById("search").value;

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
}

// API
async function summarize(text) {
  const r = await fetch("/api/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
  return (await r.json()).result;
}

async function diarize(text) {
  const r = await fetch("/api/diarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
  return (await r.json()).result;
}

window.onload = updateHistory;

// 💾 GitHub保存
async function saveToGit(text) {
  await fetch("/api/save", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
}

// 🚀 初期化
window.onload = () => {
  updateHistory();
};
