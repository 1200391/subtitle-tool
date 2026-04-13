export default async function handler(req, res) {
  const { text } = req.body;

  const content = Buffer.from(text).toString("base64");

  await fetch("https://api.github.com/repos/YOUR_NAME/YOUR_REPO/contents/log.txt", {
    method: "PUT",
    headers: {
      "Authorization": `token ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update log",
      content: content
    })
  });

  res.json({ ok: true });
}
