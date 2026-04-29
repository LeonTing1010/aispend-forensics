# Chrome Web Store 发布清单

## 基本信息

- **名称**: AI-spend Forensics
- **版本**: 0.1.2
- **类别**: 生产力工具 / 开发者工具

## 描述

### 简短描述 (最多 132 字符)
Track your AI tool spending across Cursor, Claude, and Replit. Know where your money goes.

### 详细描述

**AI-spend Forensics** helps you track and analyze your spending across AI development tools.

**Supported Platforms:**
- Cursor (cursor.com/settings)
- Claude Console (console.anthropic.com)
- Replit (replit.com billing)

**Features:**
- Automatically detects when you visit your AI tool dashboards
- Displays current month's spending in a clean popup
- Shows spending trends across multiple platforms
- Badge icon shows total spend at a glance

**Privacy:**
- All data stays on your device (local storage only)
- No data is sent to external servers
- No tracking or analytics

**How it works:**
Simply visit your AI tool dashboard pages while the extension is installed. The extension reads the usage data displayed on the page and stores it locally for easy access via the popup.

**Roadmap:**
- v0.3: Anomaly detection (get notified of unusual spending spikes)
- v0.5: Detailed forensics (per-feature attribution, cost breakdown)
- v1.0: Billing bug detection

---

## 截图要求

需要 1-5 张截图，尺寸 1280x800 或 640x400

建议截图：
1. Popup 显示已连接的 providers 和花费总额
2. Cursor settings 页面（显示扩展正在工作）
3. Claude console 页面

## 推广图片 (可选)

- 小图: 440x280
- 大图: 920x680
- 横幅: 1400x560

## 分类

- 主要: 开发者工具
- 次要: 生产力工具

## 价格

免费

## 发布检查清单

- [x] manifest.json 有效
- [x] 图标 (48x48, 128x128)
- [x] 截图准备
- [x] 隐私政策页面 (GitHub README 链接)
- [x] 支持邮箱/链接
- [ ] 开发者账号 $5 注册费
- [ ] 打包上传

## 打包命令

```bash
cd dist
zip -r ../aispend-forensics-v0.1.0.zip .
```
