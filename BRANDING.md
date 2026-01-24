# 品牌自定义指南

本项目支持自定义品牌元素（Logo、Icon、网站信息等），所有可自定义内容统一在 `src/branding.ts` 文件中管理。

## 配置文件位置

```
src/branding.ts
```

## 可自定义内容

### 1. Logo 配置

```typescript
export const logos = {
  light: '/src/assets/logo.svg',      // 亮色主题 Logo
  dark: '/src/assets/logo_dark.svg',  // 暗色主题 Logo
  pure: '/src/assets/logo_pure.svg',  // 纯 Logo（无背景）
}
```

**如何替换：**
1. 将您的 Logo 文件放入 `src/assets/` 目录
2. 修改 `branding.ts` 中的路径指向您的文件
3. 建议准备三个版本：
   - `light`: 浅色背景使用（深色 Logo）
   - `dark`: 深色背景使用（浅色 Logo）
   - `pure`: Landing 页面使用（通常是纯图标）

### 2. Favicon 配置

```typescript
export const favicon = {
  path: '/favicon.ico',  // 网站图标路径
}
```

**如何替换：**
1. 将您的 favicon.ico 文件放入 `public/` 目录
2. 如果使用其他格式（如 .png），需要同时修改 `index.html` 中的引用

### 3. 网站基本信息

```typescript
export const siteInfo = {
  name: 'iEdon Networks (iEdon-Net)',           // 网站名称
  shortName: 'iEdon-Net',                       // 简称
  description: 'iEdon Networks (iEdon-Net)...', // 网站描述
  landingSubtitle: 'Since 2017...',             // Landing 页面副标题
  keywords: 'DN42,iEdon,4242422189...',         // SEO 关键词
  url: 'https://dn42.luocynet.com',             // 网站 URL
}
```

**用途：**
- `name`: 浏览器标签标题、SEO
- `shortName`: 简短显示场景
- `description`: SEO、社交媒体分享描述
- `landingSubtitle`: Landing 页面主标题下方的副标题
- `keywords`: 搜索引擎优化
- `url`: Open Graph、sitemap 等

### 4. 网络信息配置 (Fallback)

```typescript
export const networkInfo = {
  asn: '4242421857',             // 自治系统号 (ASN)
  netName: 'LuocyTeamDN42',      // 网络名称
  netDesc: 'LuocyTeamDN42',      // 网络描述
}
```
*注：当无法从后端获取配置时，将使用这些作为默认值。*

### 5. 页脚配置

```typescript
export const footerConfig = {
  text: '',                           // 附加文本 (支持 Markdown)
  maintenanceText: '',                // 维护模式提示
  softwareName: 'iEdon PeerAPI Suite',// 软件版权/名称
  showDn42Participant: true,          // 是否显示 DN42 Wiki 链接
  links: {                            // 外部链接配置
    dn42: {
        text: 'DN42 Participant',
        url: 'https://dn42.dev',
        title: 'DN42 Wiki'
    }
  }
}
```

### 6. Open Graph 配置（社交媒体分享）

```typescript
export const openGraph = {
  title: siteInfo.name,
  siteName: siteInfo.shortName,
  type: 'website',
  description: siteInfo.description,
  url: siteInfo.url,
  // image: '/og-image.png',  // 可选：分享缩略图
}
```

**如何添加分享图片：**
1. 准备一张 1200x630 像素的图片
2. 放入 `public/` 目录（如 `public/og-image.png`）
3. 取消注释 `image` 行并设置路径
4. 需要手动在 `index.html` 中添加：
   ```html
   <meta property="og:image" content="https://your-domain.com/og-image.png" />
   ```

### 5. Logo 尺寸配置

```typescript
export const logoSizes = {
  headerHeight: '3.2rem',         // Header 中的 Logo 高度
  headerHeightMobile: '2.5rem',   // 移动端 Logo 高度
  landingWidth: 130,              // Landing 页面 Logo 宽度（像素）
}
```

### 6. Logo Alt 文本（无障碍访问）

```typescript
export const logoAlt = {
  header: 'Logo',        // Header Logo 的替代文本
  landing: 'iEdon Logo', // Landing Logo 的替代文本
}
```

## 完整替换示例

假设您的网站名为 "MyNetwork"，域名为 `mynetwork.example.com`：

### 步骤 1：准备素材

```
public/
  favicon.ico           # 您的网站图标
  og-image.png          # 社交媒体分享图（可选）

src/assets/
  my-logo-light.svg     # 亮色主题 Logo
  my-logo-dark.svg      # 暗色主题 Logo
  my-logo-pure.svg      # 纯 Logo
```

### 步骤 2：修改 `src/branding.ts`

```typescript
export const logos = {
  light: '/src/assets/my-logo-light.svg',
  dark: '/src/assets/my-logo-dark.svg',
  pure: '/src/assets/my-logo-pure.svg',
}

export const siteInfo = {
  name: 'MyNetwork - DN42 Peering Platform',
  shortName: 'MyNetwork',
  description: 'MyNetwork - Professional DN42 peering services since 2024.',
  keywords: 'DN42,MyNetwork,BGP,peering,network',
  url: 'https://mynetwork.example.com',
}

export const logoAlt = {
  header: 'MyNetwork Logo',
  landing: 'MyNetwork Logo',
}
```

### 步骤 3：更新 `index.html`（如需添加分享图片）

在 `<head>` 中添加：

```html
<meta property="og:image" content="https://mynetwork.example.com/og-image.png" />
```

### 步骤 4：更新域名相关配置

还需要修改 `src/config.ts` 中的域名配置（API 地址等）。

## 注意事项

1. **Logo 格式建议**：使用 SVG 格式以获得最佳缩放效果
2. **Favicon 兼容性**：建议同时提供多种尺寸（16x16, 32x32, 192x192）
3. **构建后生效**：修改后需要运行 `npm run build` 重新构建
4. **缓存清理**：浏览器可能缓存旧 favicon，需要强制刷新（Ctrl+F5）

## 文件引用关系

```
branding.ts
├── index.html (meta 标签需手动同步)
├── src/components/LayoutHeader.vue (Header Logo)
└── src/pages/landing/landing.vue (Landing Logo)
```

## 相关配置文件

- `src/config.ts` - API 端点、域名等运行时配置
- `public/robots.txt` - 搜索引擎爬虫配置
- `public/sitemap.xml` - 站点地图
- `scripts/generate-sitemap.js` - 自动生成 sitemap

## 疑难解答

**Q: 修改后 Logo 没有变化？**  
A: 检查：
1. 文件路径是否正确
2. 是否重新构建（`npm run build`）
3. 清除浏览器缓存

**Q: Favicon 在某些浏览器不显示？**  
A: 尝试：
1. 提供多种尺寸的 favicon
2. 添加 `<link rel="apple-touch-icon">` 支持 iOS
3. 使用 favicon.ico + favicon.png 组合

**Q: 社交媒体分享没有显示图片？**  
A: 确保：
1. `og:image` 使用完整 URL（包含域名）
2. 图片尺寸符合平台要求（推荐 1200x630）
3. 使用调试工具验证（如 Facebook Sharing Debugger）
