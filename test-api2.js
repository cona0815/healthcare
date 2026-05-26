async function test() {
  console.log("Testing generation...");
  try {
     const res = await fetch("http://localhost:3000/api/gemini/generateContent", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            model: "gemini-2.5-flash",
            contents: "say hi"
         })
     });
     console.log(await res.text());
  } catch(e) {
     console.log("error", e);
  }
}
test();
