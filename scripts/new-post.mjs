import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('用法：npm run new-post -- "文章标题"');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = title
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
  .replace(/^-|-$/g, "") || "untitled";
const baseName = `${date}-${slug}`;
const postPath = path.join(process.cwd(), "posts", `${baseName}.md`);
const assetDir = path.join(process.cwd(), "posts", "assets", baseName);
const content = `---\ntitle: ${title}\ndate: ${date}\ntags: [随笔]\nsummary: 在这里填写文章摘要。\n---\n\n# ${title}\n\n从这里开始写作。\n`;

await mkdir(assetDir, { recursive: true });
await writeFile(postPath, content, { encoding: "utf8", flag: "wx" });
console.log(`已创建 ${path.relative(process.cwd(), postPath)}`);
console.log(`图片目录 ${path.relative(process.cwd(), assetDir)}`);
