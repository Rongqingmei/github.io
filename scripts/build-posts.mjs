import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const postsDir = path.join(root, "posts");
const outputDir = path.join(root, "docs", "data");
const articleDir = path.join(root, "docs", "posts");
const sourceAssets = path.join(postsDir, "assets");
const outputAssets = path.join(articleDir, "assets");

const escapeHtml = (value = "") => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const escapeAttribute = (value = "") => escapeHtml(value).replace(/`/g, "&#96;");
const slugify = (name) => name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

function parse(file, source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} 缺少文章头部信息`);

  const fields = Object.fromEntries(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const [key, ...value] = line.split(":");
    return [key.trim(), value.join(":").trim()];
  }));

  if (!fields.title || !fields.date || !fields.summary) {
    throw new Error(`${file} 需要 title、date 和 summary`);
  }

  return {
    slug: slugify(file),
    title: fields.title,
    date: fields.date,
    summary: fields.summary,
    tags: (fields.tags || "[]").replace(/^\[|\]$/g, "").split(",").map((tag) => tag.trim()).filter(Boolean),
    body: match[2].trim(),
  };
}

function inlineMarkdown(source) {
  let text = escapeHtml(source);
  const stash = [];
  const keep = (html) => {
    const token = `\u0000${stash.length}\u0000`;
    stash.push(html);
    return token;
  };

  text = text.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
    (_, alt, src, title) => keep(`<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""} loading="lazy" decoding="async">`));
  text = text.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
    (_, label, href, title) => keep(`<a href="${escapeAttribute(href)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>${label}</a>`));
  text = text.replace(/`([^`]+)`/g, (_, code) => keep(`<code>${code}</code>`));
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[Number(index)]);
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;
  let code = null;
  let codeLanguage = "";

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
  };

  for (const line of lines) {
    const fence = line.match(/^```\s*([\w+-]*)/);
    if (fence) {
      flushParagraph(); flushList();
      if (code === null) { code = []; codeLanguage = fence[1]; }
      else {
        output.push(`<pre><code${codeLanguage ? ` class="language-${escapeAttribute(codeLanguage)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null; codeLanguage = "";
      }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { flushParagraph(); flushList(); output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); output.push("<hr>"); continue; }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const wanted = unordered ? "ul" : "ol";
      if (listType !== wanted) { flushList(); output.push(`<${wanted}>`); listType = wanted; }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph(); flushList();
  if (code !== null) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("\n");
}

const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
const posts = await Promise.all(files.map(async (file) => parse(file, await readFile(path.join(postsDir, file), "utf8"))));
posts.sort((a, b) => b.date.localeCompare(a.date));

await mkdir(outputDir, { recursive: true });
await mkdir(articleDir, { recursive: true });
await writeFile(path.join(outputDir, "posts.json"), JSON.stringify(posts.map(({ body, ...post }) => post), null, 2));
await cp(sourceAssets, outputAssets, { recursive: true, force: true }).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
for (const entry of await readdir(postsDir, { withFileTypes: true })) {
  if (entry.isFile() && mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
    await cp(path.join(postsDir, entry.name), path.join(articleDir, entry.name), { force: true });
  }
}

const allTags = [...new Set(posts.flatMap((post) => post.tags))];
const homepage = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="LINYI 的个人文章站，记录技术、创作与思考。"><title>LINYI — 写作 / 代码 / 长期主义</title><style>
:root{--paper:#f4f1ea;--ink:#151515;--muted:#716f6a;--line:#cbc7bd;--blue:#1846ee}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif}a{color:inherit;text-decoration:none}.top{height:76px;padding:0 4.6vw;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.logo{font-weight:900;letter-spacing:-.08em;font-size:25px}.logo b{color:var(--blue)}nav{display:flex;gap:30px;font-size:13px}nav a:hover,.mail:hover,footer a:hover{color:var(--blue)}.intro{min-height:calc(100vh - 76px);padding:9vw 4.6vw 4vw;display:flex;flex-direction:column;justify-content:space-between}.small,.label,.head,time,.tags,footer{font-size:11px;letter-spacing:.1em}.small{margin:0;color:var(--muted)}h1{font-size:clamp(58px,10vw,154px);line-height:.84;letter-spacing:-.08em;margin:5vw 0 auto}.introfoot{display:flex;justify-content:space-between;align-items:flex-end;font-size:15px;max-width:570px;line-height:1.45}.introfoot p{width:220px;margin:0}.orb{width:67px;height:67px;border:1px solid var(--ink);border-radius:50%;position:relative}.orb:before{content:"";position:absolute;width:17px;height:17px;background:var(--blue);right:-6px;top:3px}.orb:after{content:"";position:absolute;width:1px;height:105px;background:var(--ink);left:32px;top:-19px;transform:rotate(45deg)}.content{border-top:1px solid var(--line);display:grid;grid-template-columns:28% 1fr}.side{padding:48px 4.6vw;border-right:1px solid var(--line);min-height:640px}.label{color:var(--muted);margin:0 0 18px}.filters{display:flex;flex-direction:column;align-items:flex-start;gap:4px}.filters button{padding:4px 0;color:var(--muted);background:none;border:0;cursor:pointer;font-size:17px}.filters button.active,.filters button:hover{color:var(--ink);font-weight:700}.filters button.active:before{content:"— ";color:var(--blue)}.about{margin-top:92px;font-size:13px;line-height:1.6;color:#484641}.about p:not(.label){margin:0 0 18px}.mail{border-bottom:1px solid var(--ink);padding-bottom:2px}.feed{padding:48px 4.6vw 80px}.head{display:flex;justify-content:space-between;color:var(--muted);padding-bottom:16px;border-bottom:1px solid var(--ink)}.head p{margin:0}.post{display:grid;grid-template-columns:105px 1fr 25px;gap:20px;padding:29px 0 31px;border-bottom:1px solid var(--line);transition:padding .25s,color .25s}.post:hover{padding-left:12px;color:var(--blue)}time{color:var(--muted);padding-top:5px}.post h2{margin:0 0 10px;font-size:clamp(22px,2.35vw,36px);letter-spacing:-.05em;line-height:1.1}.post p{margin:0;color:var(--muted);font-size:14px}.tags{display:flex;gap:8px;margin-top:17px}.tags span{padding:3px 7px;border:1px solid var(--line);letter-spacing:0;font-size:10px}.arrow{font-size:20px}footer{border-top:1px solid var(--line);padding:24px 4.6vw;display:flex;gap:20px;justify-content:space-between;color:var(--muted)}footer p{margin:0}@media(max-width:700px){.top{height:64px;padding:0 24px}nav{display:none}.intro{padding:72px 24px 28px;min-height:calc(100svh - 64px)}h1{font-size:clamp(54px,17vw,95px);margin:50px 0 auto}.content{display:block}.side{padding:32px 24px;border-right:0;min-height:0}.about{margin-top:42px}.feed{padding:32px 24px 60px}.post{grid-template-columns:1fr 20px;gap:10px;padding:25px 0}.post time{grid-column:1/-1}.post h2{font-size:27px}.orb{transform:scale(.78);transform-origin:right bottom}footer{padding:20px 24px;font-size:9px;gap:10px}}
</style></head><body><header class="top"><a class="logo" href="#top">LINYI<b>.</b></a><nav><a href="#writing">文章</a><a href="#about">关于</a><a href="mailto:hello@example.com">联系</a></nav></header><main><section class="intro" id="top"><p class="small">独立写作者 / 记录者 / 永远的学习者</p><h1>写点东西，<br>做点东西。</h1><div class="introfoot"><p>关于技术、创作，以及怎样慢一点思考。</p><span class="orb"></span></div></section><section class="content" id="writing"><aside class="side"><p class="label">筛选文章</p><div class="filters" id="filters"><button class="active" data-tag="全部">全部</button>${allTags.map((tag) => `<button data-tag="${escapeAttribute(tag)}">${escapeHtml(tag)}</button>`).join("")}</div><div class="about" id="about"><p class="label">关于我</p><p>你好，我是 LINYI。这里是我的公开笔记本：把正在理解的事情，写成可以被分享的文字。</p><a class="mail" href="mailto:hello@example.com">来信交流 →</a></div></aside><div class="feed"><div class="head"><p>最新文章</p><span id="count"></span></div><div id="posts"></div></div></section></main><footer><p>© ${new Date().getFullYear()} LINYI</p><p>持续写作，缓慢生长。</p><a href="#top">回到顶部 ↑</a></footer><script>
const posts=${JSON.stringify(posts.map(({ body, ...post }) => post)).replace(/</g, "\\u003c")};const list=document.querySelector('#posts'),count=document.querySelector('#count');function draw(tag='全部'){const selected=tag==='全部'?posts:posts.filter(p=>p.tags.includes(tag));list.innerHTML=selected.map(p=>'<a class="post" href="posts/'+encodeURIComponent(p.slug)+'.html"><time>'+p.date+'</time><div><h2>'+escapeText(p.title)+'</h2><p>'+escapeText(p.summary)+'</p><div class="tags">'+p.tags.map(t=>'<span>'+escapeText(t)+'</span>').join('')+'</div></div><b class="arrow">→</b></a>').join('');count.textContent=String(selected.length).padStart(2,'0')+' 篇'}function escapeText(value){const node=document.createElement('div');node.textContent=value;return node.innerHTML}document.querySelectorAll('#filters button').forEach(button=>button.onclick=()=>{document.querySelector('.active')?.classList.remove('active');button.classList.add('active');draw(button.dataset.tag)});draw();
</script></body></html>`;
await writeFile(path.join(root, "docs", "index.html"), homepage);

for (const post of posts) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeAttribute(post.summary)}"><title>${escapeHtml(post.title)} — LINYI</title><style>
:root{--paper:#f4f1ea;--ink:#151515;--muted:#716f6a;--line:#cbc7bd;--blue:#1846ee}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif}.top{height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 7vw}.logo{font-weight:900;font-size:25px;letter-spacing:-.08em;text-decoration:none;color:var(--ink)}.logo b{color:var(--blue)}.back{font-size:13px;color:var(--ink);text-decoration:none}.article{max-width:800px;margin:0 auto;padding:10vw 28px 120px}.date,.tags{font-size:11px;letter-spacing:.1em;color:var(--muted)}.article>h1{font-size:clamp(40px,7vw,76px);line-height:1;letter-spacing:-.06em;margin:22px 0 30px}.article h2{font-size:30px;margin:58px 0 18px;letter-spacing:-.04em}.article h3{font-size:22px;margin:40px 0 14px}.article p,.article li{font-size:18px;line-height:1.9}.article p{margin:0 0 22px}.article a{color:var(--blue);text-underline-offset:3px}.article img{display:block;max-width:100%;height:auto;margin:34px auto 10px;border-radius:3px}.article blockquote{border-left:3px solid var(--blue);margin:38px 0;padding:4px 0 4px 18px;color:var(--muted);font-size:18px;line-height:1.7}.article pre{overflow:auto;background:#1d1d1d;color:#f5f5f5;padding:20px;border-radius:4px;font-size:14px;line-height:1.65}.article :not(pre)>code{background:#e8e4da;padding:2px 6px;border-radius:3px;font-size:.9em}.article hr{border:0;border-top:1px solid var(--line);margin:48px 0}.tags{margin-bottom:62px}.tags span{border:1px solid var(--line);color:var(--ink);padding:3px 7px;margin-right:6px;letter-spacing:0}@media(max-width:600px){.top{height:64px;padding:0 22px}.article{padding:70px 22px 80px}.article>h1{font-size:42px}.article p,.article li{font-size:17px}}
</style></head><body><header class="top"><a class="logo" href="../index.html">LINYI<b>.</b></a><a class="back" href="../index.html">← 返回文章列表</a></header><article class="article"><div class="date">${post.date}</div><h1>${escapeHtml(post.title)}</h1><div class="tags">${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>${renderMarkdown(post.body)}</article></body></html>`;
  await writeFile(path.join(articleDir, `${post.slug}.html`), html);
}

console.log(`已生成 ${posts.length} 篇文章。`);
