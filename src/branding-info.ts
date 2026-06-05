/**
 * 品牌配置信息文件 (无资源引用)
 * 用于 vite.config.ts 等 Node 环境引用，避免 SVG 加载错误
 */

// Favicon 配置
export const favicon = {
  // 网站图标路径
  path: '/favicon.ico',
}

// 网站基本信息
export const siteInfo = {
  // 网站标题 (浏览器标签页显示)
  // 修改这里来更改浏览器标题栏文字，例如 "MyNetwork (ASXXXX)"
  title: 'LuocyNetDN42 (AS4242421857)',
  
  // 网站名称 (品牌名)
  name: 'LuocyNetDN42',
  // 简称
  shortName: 'LuocyNetDN42',
  // 网站描述 (用于 SEO)
  description: 'LuocyNetDN42 (AS4242421857) - DN42 网络参与者，提供自动化 BGP Peering 服务。支持 WireGuard 隧道、IPv4/IPv6 双栈路由，使用 BIRD/FRR 构建稳定的对等网络连接。',
  // Landing 页面子标题
  landingSubtitle: '自动化 BGP Peering 服务 - 简化您的 DN42 网络互联',
  // 关键词
  keywords: 'DN42,LuocyNetDN42,AS4242421857,BGP,peering,auto peering,peer network,routing,BIRD,FRR,FRRouting,WireGuard,IPv6',
  // 网站 URL
  url: 'https://dn42.luocynet.com',
}

// 网络信息配置 (默认/回退配置)
// 当无法从后端获取配置时使用这些值
export const networkInfo = {
  // ASN
  asn: '4242421857',
  // 网络名称
  netName: 'LuocyNetDN42',
  // 网络描述
  netDesc: 'LuocyNetDN42',
}

// 页脚配置（当前未使用）
// export const footerConfig = {
//   // 页脚附加文本 (支持 Markdown)
//   text: '', 
//   // 维护模式提示文本
//   maintenanceText: '',
//   // 软件名称/版权 (显示在 "Powered by" 或类似位置)
//   softwareName: 'iEdon PeerAPI Suite',
//   // 显示 "DN42 Participant" 链接
//   showDn42Participant: true,
//   // 外部链接配置
//   links: {
//     dn42: {
//         text: 'DN42 Participant',
//         url: 'https://dn42.dev',
//         title: 'DN42 Wiki'
//     }
//   }
// }

// Open Graph 配置 (社交媒体分享)
export const openGraph = {
  title: siteInfo.name,
  siteName: siteInfo.shortName,
  type: 'website',
  description: siteInfo.description,
  url: siteInfo.url,
  // 如果有分享图片可以在这里配置
  // image: '/og-image.png',
}

// Logo 尺寸配置
export const logoSizes = {
  // Header 中的 Logo 高度
  headerHeight: '3.2rem',
  headerHeightMobile: '2.5rem',
  // Landing 页面中的 Logo 宽度
  landingWidth: 130,
}

// Logo alt 文本
export const logoAlt = {
  header: 'Logo',
  landing: 'iEdon Logo',
}
