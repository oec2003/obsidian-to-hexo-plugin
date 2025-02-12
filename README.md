# Obsidian Publish to Hexo Plugin

一个用于将 Obsidian 笔记发布到 Hexo 博客的插件。

## 功能特点

- 自动将中文标题翻译为英文（使用百度翻译 API）
- 生成符合 URL 规范的文件名
- 保留原文的 front-matter 信息（标题、标签、分类等）
- 自动在第一段后添加 `<!-- more -->` 标记
- 支持多种方式触发发布：
  - 左侧栏图标
  - 文件右键菜单
  - 编辑器右键菜单
  - 命令面板

## 安装要求

1. 已安装 Obsidian（https://obsidian.md/）
2. 已安装 Hexo 博客系统
3. 百度翻译 API 的 AppId 和密钥（用于标题翻译）

## 安装方法

1. 下载此仓库
2. 将文件复制到你的 Obsidian 插件目录：`{vault}/.obsidian/plugins/obsidian-pub-to-hexo-plugin/`
3. 重启 Obsidian
4. 在设置中启用插件

## 配置说明

在插件设置中填写以下信息：
1. Hexo 博客路径：你的 Hexo 博客根目录的完整路径
2. 百度翻译 AppId：从百度翻译开放平台获取
3. 百度翻译密钥：从百度翻译开放平台获取

## 使用方法

### 文章格式要求

Obsidian 笔记需要包含以下 front-matter：

```yaml
---
title: 文章标题
创建时间: 2025-02-10 18:06
修改时间: 2025-02-11 14:37
tags:
  - tag1
  - tag2
categories: 分类
---
```

### 发布文章

有多种方式可以发布文章：

1. 点击左侧栏的飞机图标
2. 在文件列表中右键点击文件，选择 "Publish to Hexo"
3. 在编辑器中右键点击，选择 "Publish to Hexo"
4. 使用命令面板（Ctrl/Cmd + P），搜索 "Publish to Hexo"

### 发布效果

插件会：
1. 将中文标题翻译为英文，并生成对应的文件名
2. 在第一段后自动添加 `<!-- more -->` 标记
3. 转换 front-matter 为 Hexo 格式：
   ```yaml
   ---
   title: 文章标题
   date: 2025-02-11 14:37
   categories: [分类]
   tags: [tag1, tag2]
   ---
   ```
4. 将文件保存到 Hexo 的 `source/_posts` 目录

## 注意事项

1. 确保已正确设置 Hexo 路径和百度翻译 API 凭据
2. 文章必须包含标题（title）字段
3. 如果发布时遇到同名文件，插件会自动覆盖

## 问题反馈

如果遇到问题或有功能建议，请提交 Issue。

## License

MIT
