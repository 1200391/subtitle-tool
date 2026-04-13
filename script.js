let recognition;
let currentText = "";
let history = [];

function startRecording() {
  currentText = "";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = "ja-JP";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      let transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        currentText += transcript + "\n";
      } else {
        interim += transcript;
      }
    }

    document.getElementById("live").innerText = interim;
  };

  recognition.start();
}

async function stopRecording() {
  recognition.stop();

  if (currentText.trim() === "") return;

  // 👥 話者分離
  const diarized = await diarize(currentText);

  // 🧠 要約
  const summary = await summarize(diarized);

  // 💾 保存
  await saveToGit(diarized);

  history.unshift("【要約】\n" + summary + "\n\n" + diarized);

  updateHistory();
}

function updateHistory() {
  const container = document.getElementById("history");
  container.innerHTML = "";

  history.forEach(text => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerText = text;
    container.appendChild(div);
  });
}

// 🔍 検索＋要約
async function searchText() {
  const keyword = document.getElementById("search").value;
  let results = [];

  history.forEach(text => {
    if (text.includes(keyword)) {
      results.push(text);
    }
  });

  if (results.length === 0) {
    document.getElementById("result").innerText = "該当なし";
    return;
  }

  const summary = await summarize(results.join("\n"));

  document.getElementById("result").innerText = summary;
}

// API呼び出し
async function summarize(text) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  return data.result;
}

async function diarize(text) {
  const res = await fetch("/api/diarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  return data.result;
}

async function saveToGit(text) {
  await fetch("/api/save", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
}
