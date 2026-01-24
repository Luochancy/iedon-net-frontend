import LogoLight from './assets/logo.svg'
import LogoDark from './assets/logo_dark.svg'
import LogoPure from './assets/logo_pure.svg'

/**
 * 品牌配置示例文件
 * 
 * 这是一个完整的品牌配置示例，展示了如何自定义所有品牌元素
 * 复制此文件内容到 src/branding.ts 并根据您的需求修改
 */

// ==================== Logo 配置 ====================
export const logos = {
  // 亮色主题 Logo（在浅色背景上显示，Logo 本身应该是深色的）
  light: LogoLight,
  
  // 暗色主题 Logo（在深色背景上显示，Logo 本身应该是浅色的）
  dark: LogoDark,
  
  // 纯 Logo（Landing 页面使用，通常是纯图标无背景）
  pure: LogoPure,
}

// ==================== Favicon 配置 ====================
export const favicon = {
  // 网站图标路径（相对于 public 目录）
  path: '/favicon.ico',
  
  // 可选：如果需要多种尺寸的图标，可以在 index.html 中添加：
  // <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  // <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  // <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
}

// ==================== 网站基本信息 ====================
export const siteInfo = {
  // 网站标题 (浏览器标签页显示)
  // 如果您希望显示 ASN，请在此处包含，例如 "MyNetwork (AS424242)"
  title: 'MyNetwork (AS424242)',

  // 网站完整名称（用于 <title> 标签和 SEO）
  name: 'MyNetwork',
  
  // 网站简称（用于简短显示场景，如 header、footer）
  shortName: 'MyNetwork',
  
  // 网站描述（用于 SEO 和社交媒体分享）
  description: 'My DN42 Network Description',

  // Landing 页面子标题 (Banner 上的文字)
  landingSubtitle: 'Welcome to My DN42 Network',
  
  // SEO 关键词（逗号分隔）
  keywords: 'DN42,MyNetwork,AS424242,BGP,Peering',
  
  // 网站 URL（完整域名，用于 sitemap、Open Graph 等）
  url: 'https://dn42.luocynet.com',
}

// ==================== Open Graph 配置（社交媒体分享）====================
export const openGraph = {
  // 分享标题（通常使用网站名称）
  title: siteInfo.name,
  
  // 站点名称
  siteName: siteInfo.shortName,
  
  // 内容类型（website、article、profile 等）
  type: 'website',
  
  // 分享描述
  description: siteInfo.description,
  
  // 页面 URL
  url: siteInfo.url,
  
  // 分享缩略图（可选，推荐尺寸 1200x630 像素）
  // 取消注释并设置图片路径：
  // image: '/og-image.png',
  
  // 如果添加了分享图片，需要在 index.html 中手动添加：
  // <meta property="og:image" content="https://your-domain.com/og-image.png" />
  // <meta property="og:image:width" content="1200" />
  // <meta property="og:image:height" content="630" />
}

// ==================== Logo 尺寸配置 ====================
export const logoSizes = {
  // Header 中的 Logo 高度（桌面端）
  // 建议范围：2.5rem - 4rem
  headerHeight: '3.2rem',
  
  // Header 中的 Logo 高度（移动端）
  // 建议范围：2rem - 3rem
  headerHeightMobile: '2.5rem',
  
  // Landing 页面中的 Logo 宽度（像素）
  // 建议范围：100 - 200
  landingWidth: 130,
}

// ==================== Logo Alt 文本 ====================
// Alt 文本用于无障碍访问和 SEO
export const logoAlt = {
  // Header Logo 的替代文本
  header: 'Logo',
  
  // Landing 页面 Logo 的替代文本
  landing: 'iEdon Logo',
}

// ==================== 网络信息配置 ====================
export const networkInfo = {
  // ASN (自治系统号)
  asn: '4242421857',
  
  // 网络名称
  netName: 'MyNetwork',
  
  // 网络描述
  netDesc: 'My Open Source Network',
}

// ==================== 页脚配置 ====================
export const footerConfig = {
  // 页脚附加文本 (支持 Markdown，换行使用 \n)
  text: '', 
  
  // 维护模式提示文本 (显示在通知栏)
  maintenanceText: '',
  
  // 软件名称/版权 (显示在 "Powered by" 或类似位置)
  // 您可以修改这里来隐藏 "iEdon PeerAPI Suite"
  softwareName: 'My Peer Portal',
  
  // 是否显示 "DN42 Participant" 链接
  showDn42Participant: true,
  
  // 外部链接配置
  links: {
    dn42: {
        text: 'DN42 Participant',
        url: 'https://dn42.dev',
        title: 'DN42 Wiki'
    }
  }
}

// ==================== 自定义示例 ====================
// 
// 示例 1：替换为您自己的品牌
// -------------------------------
// export const logos = {
//   light: '/src/assets/mycompany-logo.svg',
//   dark: '/src/assets/mycompany-logo-dark.svg',
//   pure: '/src/assets/mycompany-icon.svg',
// }
//
// export const siteInfo = {
//   name: 'MyCompany Networks',
//   shortName: 'MyCompany',
//   description: 'Professional DN42 peering services.',
//   keywords: 'DN42,MyCompany,BGP,peering',
//   url: 'https://dn42.mycompany.com',
// }
//
// export const logoAlt = {
//   header: 'MyCompany Logo',
//   landing: 'MyCompany Networks Logo',
// }
//
// ==================== 额外配置建议 ====================
//
// 1. 准备 Logo 文件：
//    - SVG 格式最佳（可无限缩放）
//    - PNG 格式需准备 2x 版本（Retina 屏幕）
//    - 建议尺寸：Header Logo 高度 64-128px，Landing Logo 宽度 200-400px
//
// 2. Favicon 建议：
//    - 提供多种尺寸：16x16, 32x32, 180x180（Apple）
//    - 使用 favicon.ico（兼容性最好）+ PNG（高清显示）
//    - 工具推荐：https://realfavicongenerator.net/
//
// 3. Open Graph 图片建议：
//    - 尺寸：1200x630 像素（Facebook/Twitter 标准）
//    - 格式：PNG 或 JPG
//    - 文件大小：< 1MB
//    - 内容：包含 Logo + 简短文字说明
//
// 4. 文件放置位置：
//    - Logo SVG/PNG：src/assets/
//    - Favicon：public/
//    - OG 图片：public/
//
// 5. 修改后需要做的：
//    - 运行 npm run build 重新构建
//    - 清除浏览器缓存测试
//    - 使用社交媒体调试工具验证 OG 标签
