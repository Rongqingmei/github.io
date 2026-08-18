# LINYI

一个适合长期写作的个人文章站。文章使用 Markdown 编写，推送到 `main` 后由 GitHub Actions 自动生成并发布到 GitHub Pages。

## 写一篇新文章

```powershell
npm run new-post -- "文章标题"
```

然后打开 `posts` 中新生成的 Markdown 文件开始写作。

在 VS Code 中可以直接把截图粘贴或拖入文章。图片会自动保存到：

```text
posts/assets/文章文件名/
```

VS Code 同时会插入标准 Markdown 图片语法：

```md
![图片说明](assets/文章文件名/image.png)
```

## 本地生成文章

```powershell
npm run posts:build
```

生成结果位于 `docs`。打开 `docs/index.html` 即可检查文章列表；文章页支持图片、链接、标题、列表、引用、粗体、斜体、删除线和代码块。

## 发布

提交并推送到 `main` 分支。GitHub Actions 会执行文章构建并发布 `docs` 目录。
