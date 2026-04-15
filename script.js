// 🔐 パスワード
const PASSWORD = "Spoon";

function unlock() {
  const input = document.getElementById("pass").value;

  if (input === PASSWORD) {
    document.getElementById("lock").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    alert("パスワードが違います");
  }
}

// 📦 履歴
let history = JSON.parse(localStorage.getItem("history")) || [];

// 🎤 音声認識
let recognition;
let currentText = "";

// 🎤 録音開始
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

    // 🔥 録音中だけ表示
    document.getElementById("live").innerText =
      currentText + "\n" + interim;
  };

  recognition.start();
}

// 🛑 録音終了（保存しない）
function stopRecording() {
  if (recognition) recognition.stop();
}

// 💾 保存（ここで履歴に入る）
async function saveCurrent() {
  if (currentText.trim() === "") return;

  const title = document.getElementById("title").value || "無題";

  let diarized = currentText;
  let summary = "（要約失敗）";

  try {
    diarized = await diarize(currentText);
  } catch (e) {
    console.error("diarize失敗", e);
  }

  try {
    summary = await summarize(diarized);
  } catch (e) {
    console.error("summarize失敗", e);
  }

  try {
    await saveToGit(diarized);
  } catch (e) {
    console.error("save失敗", e);
  }

  const entry = {
    title,
    summary,
    content: diarized,
    date: new Date().toLocaleString()
  };

  history.unshift(entry);

  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem("history", JSON.stringify(history));

  updateHistory();

  document.getElementById("live").innerText = "";
  document.getElementById("title").value = "";

  alert("保存した");
}

// 📜 履歴表示（タイトルだけ）
function updateHistory() {
  const container = document.getElementById("history");
  container.innerHTML = "";

  history.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerText = item.title + "\n" + item.date;

    // 👇 クリックで詳細表示
    div.onclick = () => {
      document.getElementById("live").innerText =
        "【要約】\n" + item.summary + "\n\n" + item.content;
    };

    // 📋 コピー
    const copyBtn = document.createElement("button");
    copyBtn.innerText = "コピー";
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.content);
      alert("コピーしました");
    };

    // ❌ 削除
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "削除";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      history.splice(index, 1);
      localStorage.setItem("history", JSON.stringify(history));
      updateHistory();
    };

    div.appendChild(document.createElement("br"));
    div.appendChild(copyBtn);
    div.appendChild(deleteBtn);

    container.appendChild(div);
  });
}

// 🔍 検索＋要約
async function searchText() {
  const keyword = document.getElementById("search").value;

  const results = history
    .filter(h => h.content.includes(keyword))
    .map(h => h.content)
    .join("\n");

  if (!results) {
    document.getElementById("result").innerText = "該当なし";
    return;
  }

  try {
    const summary = await summarize(results);
    document.getElementById("result").innerText =
      "▼要約\n" + summary;
  } catch (e) {
    console.error(e);
    alert("検索要約エラー");
  }
}

// 🧠 要約API
async function summarize(text) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  return data.result;
}

// 👥 話者分離API
async function diarize(text) {
  const res = await fetch("/api/diarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  return data.result;
}

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
