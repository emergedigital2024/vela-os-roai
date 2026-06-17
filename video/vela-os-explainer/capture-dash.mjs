import puppeteer from "puppeteer-core";
const CHROME = process.env.CHROME;
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox","--force-color-profile=srgb","--hide-scrollbars"] });
async function cap(url, w, h, out) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await p.addStyleTag({ content: "::-webkit-scrollbar{display:none!important} html,body{scrollbar-width:none!important}" });
  await p.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} window.scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 1600));
  await p.screenshot({ path: out, type: "png" }); // viewport-sized = exact w×h at DPR1
  await p.close();
  console.log("wrote", out);
}
await cap("http://localhost:8788/?view=client&section=roai", 390, 844, "models/vela-phone.png");
await cap("http://localhost:8788/?view=agency&section=analytics", 1440, 900, "models/vela-laptop.png");
await b.close();
