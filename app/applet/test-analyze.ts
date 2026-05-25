import { analyzeFoodImage, fileToGenerativePart } from "./services/geminiService";

async function test() {
  try {
    const res = await fetch("https://upload.wikimedia.org/wikipedia/commons/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg");
    const blob = await res.blob();
    const file = new File([blob], "food.jpg", { type: "image/jpeg" });
    const b64 = await fileToGenerativePart(file);
    const result = await analyzeFoodImage(b64, "image/jpeg");
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}
test();
