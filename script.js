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

// 🎤 音声認識
let recognition;
let currentText = "";

// 🎤 録音開始
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

    // 🔥 中央スクロール
    setTimeout(() => {
      live.scrollTop = live.scrollHeight / 2;
    }, 0);
  };

  recognition.start();
}

// 🛑 録音終了
function stopRecording() {
  if (recognition) recognition.stop();
}

// 💾 保存
async function saveCurrent() {
  if (!currentText.trim()) return;

  const title = document.getElementById("title").value || "無題";

  let diarized = currentText;

  try {
    diarized = await diarize(currentText);
  } catch (e) {
    console.error(e);
  }

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

// 📜 履歴表示
function updateHistory() {
  const el = document.getElementById("history");
  el.innerHTML = "";

  history.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "item";

    // 🔥 1行表示
    div.innerText = `${h.title} | ${h.date}`;

    div.onclick = () => openDetail(i);

    el.appendChild(div);
  });
}

// 📄 詳細表示
function openDetail(i) {
  document.getElementById("app").style.display = "none";
  document.getElementById("detailPage").style.display = "block";

  const h = history[i];

  const formatted = formatText(h.content);

  document.getElementById("detailText").innerText =
    "【" + h.title + "】\n\n" + formatted;
}

// 🔙 戻る
function goBack() {
  document.getElementById("detailPage").style.display = "none";
  document.getElementById("app").style.display = "block";
}

async function searchText() {
  const key = document.getElementById("search").value.trim();

  if (!key) return;

  // 🟢 タイトル一致（完全 or 部分一致）
  const titleMatch = history.find(h =>
    h.title.includes(key)
  );

  if (titleMatch) {
    try {
      const summary = await summarize(titleMatch.content);

      document.getElementById("result").innerText =
        "▼タイトル一致の要約\n\n" + summary;

      return;
    } catch (e) {
      console.error(e);
      alert("要約エラー");
      return;
    }
  }

  // 🔵 本文検索（複数ヒット）
  const texts = history
    .filter(h => h.content.includes(key))
    .map(h => h.content)
    .join("\n");

  if (!texts) {
    document.getElementById("result").innerText = "該当なし";
    return;
  }

  try {
    const summary = await summarize(texts);

    document.getElementById("result").innerText =
      "▼検索結果の要約\n\n" + summary;

  } catch (e) {
    console.error(e);
    alert("要約エラー");
  }
}

// 🧠 テキスト整形（句読点＋改行）
function formatText(text) {
  return text
    // 改行を一旦スペースに
    .replace(/\n+/g, " ")

    // 文末で改行
    .replace(/。/g, "。\n")
    .replace(/！/g, "！\n")
    .replace(/？/g, "？\n")

    // 連続スペース削除
    .replace(/\s+/g, " ")

    // 行頭・行末の空白削除
    .trim();
}

// 🧠 要約API
async function summarize(text) {
  const r = await fetch("/api/summarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  return (await r.json()).result;
}

// 👥 話者分離API
async function diarize(text) {
  const r = await fetch("/api/diarize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  return (await r.json()).result;
}

// 🚀 初期化
window.onload = updateHistory;
