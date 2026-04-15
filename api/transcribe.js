export default async function handler(req, res) {
  try {
    const formData = await req.formData();

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();

    res.json({ text: data.text });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
