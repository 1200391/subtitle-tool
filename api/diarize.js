export default async function handler(req, res) {
  const { text } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
以下の会話を話者ごとに分けてください。

条件：
・「自身」「相手1」「相手2」で分ける
・必ずどれかに割り当てる
・自然な会話として区切る
・読みやすく改行する

出力形式：
自身: ○○
相手1: ○○
相手2: ○○
`
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      result: data.choices?.[0]?.message?.content || "分離失敗"
    });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
