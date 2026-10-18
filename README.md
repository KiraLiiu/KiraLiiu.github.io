# Jinwen (Kira) Liu — personal website

Jekyll site, served by GitHub Pages at https://kiraliiu.github.io.

## 想更新什么，就动哪里

| 想做的事 | 怎么做 |
|---|---|
| 换头像 | 放一张 `images/avatar.jpg`（或 .png），删掉就恢复成首字母 |
| 加作品 | 把图片拖进 `images/gallery/<分类>/`（分类可以是地点，如 `Japan/`），文件夹名就是分类，文件名就是标题：`2025-Morning-Light.jpg` → *Morning Light · 2025* |
| 放 CV 下载 | 把 PDF 命名为 `cv.pdf`（或 `cv-clinical.pdf` 等）放进 `files/`，CV 页自动出现下载按钮 |
| 新闻 / 论文 / 报告 / 音乐 / 履历 | 改 `_data/` 里对应的 `.yml` 文件（会议是 `conferences.yml`：全部显示在 Research 的 Conference，`kind: Talk` 的同时出现在 Talks 页）|
| 地图上加一个去过的地方 | 在 `_data/places.yml` 加一行：名字 + 经纬度（Google Maps 右键可复制） |
| 首页按钮（Email / Scholar / LinkedIn / GitHub） | `_config.yml` 里填链接，空着就不显示 |
| 名字、简介、链接、导航 | `_config.yml` |
| 页面正文（首页简介、研究方向等） | `pages/` 里对应的 `.html` |
| 换某一页的主题色 | 该页 `pages/*.html` 开头的 `hue:`（0–360 的色相，比如 265 长春花蓝、160 鼠尾草绿） |

图片请用 jpg / png / webp（iPhone 的 HEIC 浏览器显示不了）。

**论文标签**（`_data/publications.yml`）：`fields` 从 Machine Learning / Natural Language Processing / Computational Biology & Bioinformatics / Clinical Informatics / Epidemiology / Metabolism / Aging / Mental Health / Health Equity 里选，每个领域自带颜色，也会自动出现在筛选按钮里；`role` 写 Co-first author 或 First author；未发表的写 `status: Manuscript`。新增领域需在 `assets/style.css` 里给它配一个颜色。

## 目录

```
_config.yml    站点信息、链接、导航
_data/         内容清单：news, publications, conferences, places, music, cv
pages/         每个页面一个文件
images/        头像 + gallery/
files/         要公开的 PDF
assets/        样式与脚本（一般不用动）
_layouts/      所有页面共用的框架（一般不用动）
_includes/     联系方式按钮、会议条目（一般不用动）
_private/      私人资料，不会发布也不会上传（已在 .gitignore）
```

## 本地预览

```sh
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:$PATH"
jekyll serve        # 打开 http://localhost:4000
```
