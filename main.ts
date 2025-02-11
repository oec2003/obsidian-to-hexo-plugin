import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';
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

        // 添加发布到Hexo的按钮
        this.addRibbonIcon('paper-plane', 'Publish to Hexo', async () => {
            await this.convertAndShowTitle();
        });

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

    // 获取并转换标题
    async convertAndShowTitle() {
        if (!this.settings.baiduAppId || !this.settings.baiduKey) {
            new Notice('Please set your Baidu API credentials in the settings');
            return;
        }

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active markdown file');
            return;
        }

        const title = activeView.getDisplayText();
        try {
            const translatedTitle = await this.translateText(title);
            
            // 转换为小写并用横线替换空格和特殊字符
            const slugTitle = translatedTitle
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // 移除特殊字符
                .replace(/\s+/g, '-') // 空格替换为横线
                .replace(/-+/g, '-'); // 移除多余的横线

            new Notice(`Converted title: ${slugTitle}`);
        } catch (error) {
            console.error('Translation error:', error);
            new Notice('Error translating title: ' + error.message);
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
