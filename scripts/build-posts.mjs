import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const postsDir = path.join(root, "posts");
const outputDir = path.join(root, "docs", "data");
const articleDir = path.join(root, "docs", "posts");

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const slugify = (name) => name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

function parse(file, source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} 缺少文章头部信息`);
  const fields = Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const [key, ...value] = line.split(":");
    return [key.trim(), value.join(":").trim()];
  }));
  if (!fields.title || !fields.date || !fields.summary) throw new Error(`${file} 需要 title、date 和 summary`);
  return { slug: slugify(file), title: fields.title, date: fields.date, summary: fields.summary, tags: (fields.tags || "[]").replace(/^\[|\]$/g, "").split(",").map((tag) => tag.trim()).filter(Boolean), body: match[2].trim() };
}

function renderMarkdown(markdown) {
  return markdown.split(/\r?\n/).map((line) => {
    const text = escapeHtml(line);
    if (/^# /.test(line)) return `<h1>${text.slice(2)}</h1>`;
    if (/^## /.test(line)) return `<h2>${text.slice(3)}</h2>`;
    if (/^> /.test(line)) return `<blockquote>${text.slice(2)}</blockquote>`;
    if (!line.trim()) return "";
    return `<p>${text}</p>`;
  }).join("\n");
}

const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
const posts = await Promise.all(files.map(async (file) => parse(file, await readFile(path.join(postsDir, file), "utf8"))));
posts.sort((a, b) => b.date.localeCompare(a.date));
await mkdir(outputDir, { recursive: true });
await mkdir(articleDir, { recursive: true });
await writeFile(path.join(outputDir, "posts.json"), JSON.stringify(posts.map(({ body, ...post }) => post), null, 2));
for (const post of posts) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(post.title)} — LINYI</title><style>body{margin:0;background:#f4f1ea;color:#151515;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif}.top{height:76px;border-bottom:1px solid #cbc7bd;display:flex;align-items:center;justify-content:space-between;padding:0 7vw}.logo{font-weight:900;font-size:25px;letter-spacing:-.08em;text-decoration:none;color:#151515}.logo b{color:#1846ee}.back{font-size:13px;color:#151515;text-decoration:none}.article{max-width:720px;margin:0 auto;padding:12vw 28px 120px}.date,.tags{font-size:11px;letter-spacing:.1em;color:#716f6a}.article h1{font-size:clamp(42px,7vw,80px);line-height:.95;letter-spacing:-.07em;margin:22px 0 58px}.article h2{font-size:25px;margin:52px 0 14px;letter-spacing:-.04em}.article p{font-size:18px;line-height:1.9;margin:0 0 22px}.article blockquote{border-left:3px solid #1846ee;margin:38px 0;padding:4px 0 4px 18px;color:#716f6a;font-size:18px;line-height:1.7}.tags span{border:1px solid #cbc7bd;color:#151515;padding:3px 7px;margin-right:6px;letter-spacing:0}</style></head><body><header class="top"><a class="logo" href="../index.html">LINYI<b>.</b></a><a class="back" href="../index.html">← 返回文章列表</a></header><article class="article"><div class="date">${post.date}</div><h1>${escapeHtml(post.title)}</h1><div class="tags">${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>${renderMarkdown(post.body)}</article></body></html>`;
  await writeFile(path.join(articleDir, `${post.slug}.html`), html);
}
