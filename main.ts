import { App, Editor, MarkdownView, Menu, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, requestUrl } from 'obsidian';
import * as CryptoJS from 'crypto-js';

interface HexoPublishSettings {
    hexoPath: string;
    baiduAppId: string;
    baiduKey: string;
}

const DEFAULT_SETTINGS: HexoPublishSettings = {
    hexoPath: '',
    baiduAppId: '',
    baiduKey: ''
}

export default class HexoPublishPlugin extends Plugin {
    settings: HexoPublishSettings;

    async onload() {
        await this.loadSettings();

        // 添加发布到Hexo的按钮（左侧栏）
        this.addRibbonIcon('paper-plane', 'Publish to Hexo', async () => {
            await this.convertAndShowTitle();
        });

        // 添加到文件菜单
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle('Publish to Hexo')
                            .setIcon('paper-plane')
                            .onClick(async () => {
                                await this.convertAndShowTitle();
                            });
                    });
                }
            })
        );

        // 添加到编辑器菜单（右键菜单）
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Publish to Hexo')
                        .setIcon('paper-plane')
                        .onClick(async () => {
                            await this.convertAndShowTitle();
                        });
                });
            })
        );

        // 添加命令
        this.addCommand({
            id: 'publish-to-hexo',
            name: 'Publish current note to Hexo',
            callback: async () => {
                await this.convertAndShowTitle();
            }
        });

        // 添加设置标签
        this.addSettingTab(new HexoPublishSettingTab(this.app, this));
    }

    // 解析 Obsidian 的 front-matter
    parseFrontMatter(content: string): { [key: string]: any } {
        const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        if (!match) {
            return {};
        }

        const frontMatter = match[1];
        const result: { [key: string]: any } = {};
        
        // 解析每一行
        const lines = frontMatter.split('\n');
        let currentKey = '';
        let inArray = false;
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // 检查是否是新的键
            const keyMatch = line.match(/^([^:]+):\s*(.*)/);
            if (keyMatch) {
                currentKey = keyMatch[1].trim();
                const value = keyMatch[2].trim();
                inArray = false;
                
                if (value) {
                    result[currentKey] = value;
                } else {
                    result[currentKey] = [];
                    inArray = true;
                }
            }
            // 如果是数组项
            else if (inArray && line.trim().startsWith('-')) {
                const value = line.trim().substring(1).trim();
                if (!Array.isArray(result[currentKey])) {
                    result[currentKey] = [];
                }
                result[currentKey].push(value);
            }
        }
        
        return result;
    }

    // 创建 Hexo 的 front-matter
    createHexoFrontMatter(originalFrontMatter: { [key: string]: any }): string {
        const title = originalFrontMatter['title'] || '';
        const date = originalFrontMatter['修改时间'] || originalFrontMatter['创建时间'] || new Date().toISOString();
        
        // 处理标签和分类
        const tags = Array.isArray(originalFrontMatter['tags']) 
            ? `[${originalFrontMatter['tags'].join(',')}]`
            : originalFrontMatter['tags'] ? `[${originalFrontMatter['tags']}]` : '[]';
            
        const categories = Array.isArray(originalFrontMatter['categories'])
            ? `[${originalFrontMatter['categories'].join(',')}]`
            : originalFrontMatter['categories'] ? `[${originalFrontMatter['categories']}]` : '[]';

        return `---
title: ${title}
date: ${date}
categories: ${categories}
tags: ${tags}
---`;
    }

    // 处理文章内容，添加 more 标记
    processContent(content: string): string {
        // 移除原始的 front-matter
        const contentWithoutFrontMatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // 按照空行分割段落
        const paragraphs = contentWithoutFrontMatter.split(/\n\s*\n/);
        
        if (paragraphs.length <= 1) {
            return contentWithoutFrontMatter;
        }
        
        // 重新组合内容，在第一段后添加 more 标记
        return paragraphs[0] + '\n\n<!-- more -->\n\n' + paragraphs.slice(1).join('\n\n');
    }

    // 获取并转换标题，然后发布到 Hexo
    async convertAndShowTitle() {
        if (!this.settings.baiduAppId || !this.settings.baiduKey) {
            new Notice('Please set your Baidu API credentials in the settings');
            return;
        }

        if (!this.settings.hexoPath) {
            new Notice('Please set your Hexo blog path in the settings');
            return;
        }

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active markdown file');
            return;
        }

        const content = activeView.editor.getValue();
        const originalFrontMatter = this.parseFrontMatter(content);
        
        if (!originalFrontMatter.title) {
            new Notice('No title found in front-matter');
            return;
        }

        try {
            const translatedTitle = await this.translateText(originalFrontMatter.title);
            
            // 转换为小写并用横线替换空格和特殊字符
            const slugTitle = translatedTitle
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // 移除特殊字符
                .replace(/\s+/g, '-') // 空格替换为横线
                .replace(/-+/g, '-'); // 移除多余的横线

            // 处理内容，添加 more 标记
            const processedContent = this.processContent(content);
            
            // 构建新的 front-matter
            const hexoFrontMatter = this.createHexoFrontMatter(originalFrontMatter);
            
            // 构建完整的文件内容
            const fullContent = hexoFrontMatter + '\n' + processedContent;
            
            // 发布到 Hexo
            await this.publishToHexo(slugTitle, fullContent);
            
            new Notice(`Published to Hexo as: ${slugTitle}`);
        } catch (error) {
            console.error('Error:', error);
            new Notice('Error: ' + error.message);
        }
    }

    // 发布到 Hexo
    async publishToHexo(slugTitle: string, content: string): Promise<void> {
        const fs = require('fs');
        const path = require('path');
        
        // 确保文件扩展名为 .md
        const fileName = slugTitle.endsWith('.md') ? slugTitle : slugTitle + '.md';
        
        // 构建目标路径
        const postsDir = path.join(this.settings.hexoPath, 'source', '_posts');
        const targetPath = path.join(postsDir, fileName);
        
        // 确保 _posts 目录存在
        if (!fs.existsSync(postsDir)) {
            throw new Error('Hexo _posts directory not found: ' + postsDir);
        }
        
        // 检查文件是否已存在
        const fileExists = fs.existsSync(targetPath);
        
        // 写入文件
        try {
            fs.writeFileSync(targetPath, content, 'utf8');
            if (fileExists) {
                new Notice(`Updated existing file: ${fileName}`);
            } else {
                new Notice(`Created new file: ${fileName}`);
            }
        } catch (error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
    }

    async translateText(text: string): Promise<string> {
        try {
            const salt = Math.random().toString(36).substr(2);
            const appid = this.settings.baiduAppId;
            const key = this.settings.baiduKey;
            const str = appid + text + salt + key;
            const sign = CryptoJS.MD5(str).toString();

            const params = new URLSearchParams({
                q: text,
                from: 'zh',
                to: 'en',
                appid: appid,
                salt: salt,
                sign: sign
            });

            const response = await requestUrl({
                url: `https://api.fanyi.baidu.com/api/trans/vip/translate?${params.toString()}`,
                method: 'GET'
            });

            console.log('Translation response:', response);

            if (response.status !== 200) {
                throw new Error(`Translation failed: ${response.text}`);
            }

            const result = JSON.parse(response.text);
            if (result.error_code) {
                throw new Error(`Translation error: ${result.error_msg}`);
            }

            return result.trans_result[0].dst;
        } catch (error) {
            console.error('Translation error details:', error);
            throw error;
        }
    }

    onunload() {
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HexoPublishSettingTab extends PluginSettingTab {
    plugin: HexoPublishPlugin;

    constructor(app: App, plugin: HexoPublishPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Hexo Publish Settings'});

        // 百度翻译 AppId 设置
        new Setting(containerEl)
            .setName('Baidu Translate AppId')
            .setDesc('Enter your Baidu Translate AppId')
            .addText(text => text
                .setPlaceholder('Your AppId')
                .setValue(this.plugin.settings.baiduAppId)
                .onChange(async (value) => {
                    this.plugin.settings.baiduAppId = value;
                    await this.plugin.saveSettings();
                }));

        // 百度翻译密钥设置
        new Setting(containerEl)
            .setName('Baidu Translate Key')
            .setDesc('Enter your Baidu Translate Key')
            .addText(text => text
                .setPlaceholder('Your Key')
                .setValue(this.plugin.settings.baiduKey)
                .onChange(async (value) => {
                    this.plugin.settings.baiduKey = value;
                    await this.plugin.saveSettings();
                }));

        // Hexo 路径设置
        new Setting(containerEl)
            .setName('Hexo Path')
            .setDesc('The path to your Hexo blog directory')
            .addText(text => text
                .setPlaceholder('Enter your Hexo blog path')
                .setValue(this.plugin.settings.hexoPath)
                .onChange(async (value) => {
                    this.plugin.settings.hexoPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}
