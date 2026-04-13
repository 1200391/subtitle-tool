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

// 📦 履歴（保存）
let history = JSON.parse(localStorage.getItem("history")) || [];

// 🎤 音声認識
let recognition;
let currentText = "";

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

    // 🔥 録音中ずっと残る表示
    document.getElementById("live").innerText =
      currentText + "\n" + interim;
  };

  recognition.start();
}

// 🛑 停止 → AI処理
async function stopRecording() {
  recognition.stop();

  if (currentText.trim() === "") return;

  try {
    // 👥 話者分離
    const diarized = await diarize(currentText);

    // 🧠 要約
    const summary = await summarize(diarized);

    // 💾 GitHub保存
    await saveToGit(diarized);

    // 📦 履歴追加
    const entry = "【要約】\n" + summary + "\n\n" + diarized;
    history.unshift(entry);

    // 🔥 最大10件
    if (history.length > 10) {
      history.pop();
    }

    // 🔥 保存
    localStorage.setItem("history", JSON.stringify(history));

    updateHistory();
  } catch (e) {
    console.error(e);
    alert("エラーが発生しました（APIキー or 通信）");
  }

  document.getElementById("live").innerText = "";
}

// 📜 履歴表示
function updateHistory() {
  const container = document.getElementById("history");
  container.innerHTML = "";

  history.forEach((text, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerText = text;

    // 📋 コピー
    const copyBtn = document.createElement("button");
    copyBtn.innerText = "コピー";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      alert("コピーしました");
    };

    // ❌ 削除
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "削除";
    deleteBtn.onclick = () => {
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

  try {
    const summary = await summarize(results.join("\n"));
    document.getElementById("result").innerText =
      "▼要約\n" + summary;
  } catch (e) {
    console.error(e);
    alert("検索要約でエラー");
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

// 💾 GitHub保存API
async function saveToGit(text) {
  await fetch("/api/save", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });
}

// 🚀 初期表示
window.onload = () => {
  updateHistory();
};
