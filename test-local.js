async function test() {
  const req = await fetch("http://127.0.0.1:3000/api/gemini/generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          model: "gemini-2.5-flash",
          contents: { parts: [{ text: "Hello" }] }
      })
  });
  console.log(req.status);
  console.log(await req.text());
}
test();
