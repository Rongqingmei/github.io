import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("generates a readable homepage and article index", async () => {
  const [homepage, index] = await Promise.all([
    readFile(new URL("docs/index.html", root), "utf8"),
    readFile(new URL("docs/data/posts.json", root), "utf8"),
  ]);
  const posts = JSON.parse(index);

  assert.match(homepage, /<meta charset="utf-8">/);
  assert.match(homepage, /写点东西/);
  assert.ok(posts.length > 0);
  assert.ok(posts.every((post) => post.slug && post.title && post.date && post.summary));
});

test("renders Markdown images and copies their files", async () => {
  const article = await readFile(new URL("docs/posts/first-note.html", root), "utf8");

  assert.match(article, /<img src="image\.png" alt="alt text"/);
  assert.match(article, /loading="lazy"/);
  await access(new URL("docs/posts/image.png", root));
});

test("adds responsive article styles and common Markdown elements", async () => {
  const article = await readFile(new URL("docs/posts/first-note.html", root), "utf8");

  assert.match(article, /\.article img\{[^}]*max-width:100%/);
  assert.match(article, /<h1>About This Article<\/h1>/);
  assert.match(article, /\.article blockquote\{/);
});
