import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

const origin = "https://www.zyteron.cl";
const output = process.argv[2] || "output/redesign-08-11-2026/published-ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const paths = [
  "/",
  "/contacto?tipo=sistema",
  "/cotizador",
  "/tiendas-online",
  "/sistemas-web",
  "/planes",
  "/demos",
  "/becas-web-pyme",
  "/casos-exito/fenice-spa",
  "/casos-exito/casos-exito-sistema-control-interno-negocios-eliana",
];

try {
  for (const width of [1440, 360, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 1000 : 844 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    // Las comprobaciones públicas no crean solicitudes ni envían eventos analíticos.
    await context.route("**/*", (route) => {
      const request = route.request();
      if (
        !["GET", "HEAD"].includes(request.method()) ||
        /googletagmanager|google-analytics|doubleclick|googleadservices/.test(request.url())
      )
        return route.abort();
      return route.continue();
    });
    for (const path of paths) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const result = { width, path, errors };
      try {
        const response = await page.goto(origin + path, {
          waitUntil: "networkidle",
          timeout: 90000,
        });
        result.status = response.status();
        await page.locator("main h1").waitFor();
        result.h1Count = await page.locator("main h1").count();
        if (path === "/contacto?tipo=sistema") {
          await page.waitForFunction(
            () => document.querySelector("#projectType")?.value === "Sistema interno",
          );
          result.systemSelected = true;
        }
        if (path === "/cotizador") {
          result.sevenSteps = await page.getByText("7 pasos para preparar tu solicitud").count();
          await page.getByRole("button", { name: "Comenzar cotización" }).click();
          result.firstStep = await page.getByText("Paso 1 de 7", { exact: true }).count();
        }
        if (["/contacto?tipo=sistema", "/cotizador", "/becas-web-pyme"].includes(path))
          result.obstructingChat = await page
            .getByRole("button", { name: "Abrir asistente virtual" })
            .count();
        result.overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        result.violations = axe.violations.map(({ id, impact, nodes }) => ({
          id,
          impact,
          nodes: nodes.map(({ target }) => target),
        }));
        result.brokenImages = await page
          .locator("main img")
          .evaluateAll((images) =>
            images
              .filter((image) => image.complete && image.naturalWidth === 0)
              .map((image) => image.getAttribute("src")),
          );
        for (const section of await page.locator("main > section").all())
          await section.scrollIntoViewIfNeeded();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `${output}/${width}-${path === "/" ? "inicio" : path.replaceAll("/", "_").split("?")[0]}.png`,
          fullPage: true,
        });
      } catch (error) {
        result.failure = error.message;
      } finally {
        await page.close();
      }
      results.push(result);
      console.log(JSON.stringify(result));
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2) + "\n");
}
if (
  results.some(
    (result) =>
      result.failure ||
      result.status !== 200 ||
      result.h1Count !== 1 ||
      result.overflow ||
      result.errors.length ||
      result.violations?.length ||
      result.brokenImages?.length ||
      result.obstructingChat ||
      result.sevenSteps === 0 ||
      result.firstStep === 0,
  )
)
  process.exitCode = 1;
