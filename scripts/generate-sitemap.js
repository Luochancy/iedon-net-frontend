#!/usr/bin/env node

/**
 * Sitemap Generator for iEdon-Net Frontend
 * 
 * This script generates a sitemap.xml file in the public directory during build time.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SITE_URL = 'https://dn42.luocynet.com'
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml')

// Static routes with their priorities and change frequencies
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'monthly' },
  { path: '/nodes', priority: '0.8', changefreq: 'monthly' },
  { path: '/signin', priority: '0.3', changefreq: 'monthly' }
]

/**
 * Generate XML sitemap content
 */
function generateSitemap() {
  const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

  // Add static routes
  console.log('📝 Adding static routes to sitemap...')
  STATIC_ROUTES.forEach(route => {
    xml += `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`
  })

  xml += `</urlset>`
  
  return xml
}

/**
 * Write sitemap to file
 */
function writeSitemap(content) {
  try {
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH)
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    fs.writeFileSync(OUTPUT_PATH, content, 'utf8')
    console.log(`✅ Sitemap generated successfully: ${OUTPUT_PATH}`)
    
    // Display file stats
    const stats = fs.statSync(OUTPUT_PATH)
    console.log(`📊 Sitemap size: ${(stats.size / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('❌ Error writing sitemap:', error.message)
    throw error
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting sitemap generation...')
  console.log(`🌐 Site URL: ${SITE_URL}`)
  
  try {
    // Generate sitemap XML
    const sitemapXML = generateSitemap()
    
    // Write to file
    writeSitemap(sitemapXML)
    
    console.log('🎉 Sitemap generation completed successfully!')
    
    // Display summary
    console.log(`📈 Total URLs in sitemap: ${STATIC_ROUTES.length}`)
    
  } catch (error) {
    console.error('💥 Fatal error during sitemap generation:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
