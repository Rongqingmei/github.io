"use client";

import { useMemo, useState } from "react";

const posts = [
  { date: "2026.08.12", title: "把复杂留给系统，把简单还给人", text: "一份关于工具、界面与注意力的工作笔记。", tags: ["随笔", "产品"] },
  { date: "2026.07.28", title: "为自己搭一张可生长的知识地图", text: "不是第二大脑，而是一套能陪你持续思考的索引。", tags: ["方法", "写作"] },
  { date: "2026.07.03", title: "小项目的工程感：从一个按钮开始", text: "设计边界、命名与反馈，让小东西也值得被认真完成。", tags: ["代码", "实践"] },
  { date: "2026.06.19", title: "关于长期主义的一点不合时宜", text: "把速度当作变量，而不是唯一的价值尺度。", tags: ["随笔"] },
  { date: "2026.05.31", title: "我如何处理散落的灵感", text: "从捕获到复用：一份足够轻的个人工作流。", tags: ["方法", "写作"] },
];

const filters = ["全部", "随笔", "写作", "代码", "方法", "产品"];

export default function Home() {
  const [active, setActive] = useState("全部");
  const [menuOpen, setMenuOpen] = useState(false);
  const filtered = useMemo(() => active === "全部" ? posts : posts.filter((post) => post.tags.includes(active)), [active]);

  const chooseFilter = (filter: string) => {
    setActive(filter);
    setMenuOpen(false);
  };

  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="LINYI 首页">LINYI<span>.</span></a>
        <nav className="nav" aria-label="主导航"><a href="#writing">文章</a><a href="#about">关于</a><a href="mailto:hello@example.com">联系</a></nav>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="筛选文章">{menuOpen ? "关闭" : "目录"}</button>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">独立写作者 / 记录者 / 永远的学习者</p>
        <h1>写点东西，<br />做点东西。</h1>
        <div className="intro-foot"><p>关于技术、创作和怎样慢一点思考。</p><span className="orb"><i /></span></div>
      </section>

      <section className="content" id="writing">
        <aside className={menuOpen ? "sidebar open" : "sidebar"}>
          <p className="side-label">检索文章</p>
          <div className="filters">{filters.map((filter) => <button key={filter} onClick={() => chooseFilter(filter)} className={active === filter ? "active" : ""}>{filter}</button>)}</div>
          <div className="about" id="about"><p className="side-label">关于我</p><p>你好，我是 LINYI。这里是我的小小公开笔记本：把正在理解的事情，写成可以被分享的文字。</p><a href="mailto:hello@example.com">来信交流 ↗</a></div>
        </aside>
        <div className="feed">
          <div className="feed-head"><p>最新文章</p><span>{String(filtered.length).padStart(2, "0")} 篇</span></div>
          <div className="post-list">{filtered.map((post, index) => <article className="post" key={post.title} style={{ "--i": index } as React.CSSProperties}><a href="#writing" aria-label={`阅读：${post.title}`}><time>{post.date}</time><div><h2>{post.title}</h2><p>{post.text}</p><div className="tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><b>↗</b></a></article>)}</div>
          {filtered.length === 0 && <p className="empty">这里暂时没有文章。</p>}
        </div>
      </section>

      <footer><p>© 2026 LINYI</p><p>持续写作，缓慢生长。</p><a href="#top">回到顶部 ↑</a></footer>
    </main>
  );
}
