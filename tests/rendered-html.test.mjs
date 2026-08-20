import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("renders the restored roadmap interactions and palette-only Label 2.2", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("features", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const home = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, ctx);
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.match(homeHtml, /朱诺：新起源/);
  assert.match(homeHtml, /Label 转换器 2\.2/);
  assert.match(homeHtml, /aria-haspopup="dialog"/);
  assert.match(homeHtml, /href="https:\/\/juno\.foxbridge\.team"/);
  assert.match(homeHtml, />教程站<\/a>/);
  assert.doesNotMatch(homeHtml, />关闭<\/button>/);

  const label = await worker.fetch(new Request("http://localhost/label", { headers: { accept: "text/html" } }), env, ctx);
  const labelHtml = await label.text();
  assert.equal(label.status, 200);
  assert.match(labelHtml, /游戏调色板/);
  assert.match(labelHtml, /2–10 色调色板/);
  assert.doesNotMatch(labelHtml, /完整 RGB/);
  assert.doesNotMatch(labelHtml, /RGB 通道精度/);
  assert.doesNotMatch(labelHtml, /256 色/);
  assert.doesNotMatch(labelHtml, /自适应真彩/);
  assert.match(labelHtml, /列数/);
  assert.match(labelHtml, /行数/);
  assert.match(labelHtml, /LABEL 2\.2 · LOCAL/);
});
