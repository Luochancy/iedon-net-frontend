/*
*******************************************************************
common/i18nContent.ts

Multi-language content parser.
Parses content blocks like <zh-CN>...</zh-CN><en-US>...</en-US>
and extracts the appropriate locale with fallback logic.

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
*/

// Regex to match language blocks: <locale>content</locale>
const LANG_BLOCK_RE = /<([a-zA-Z]{2}[-_][a-zA-Z]{2})>([\s\S]*?)<\/\1>/g

// Fallback priority: en first, then zh variants, then any
const FALLBACK_ORDER = ['en-US', 'en', 'zh-CN', 'zh-HK', 'zh']

/**
 * Parse multi-language content and return the text for the given locale.
 *
 * Format example:
 *   <zh-CN>中文内容</zh-CN>
 *   <en-US>English content</en-US>
 *   <ja-JP>日本語コンテンツ</ja-JP>
 *
 * Fallback logic:
 *   1. Exact match for current locale (e.g. "zh-CN")
 *   2. Language prefix match (e.g. "zh" for "zh-HK")
 *   3. English ("en-US" or "en")
 *   4. Chinese ("zh-CN" or "zh-HK" or "zh")
 *   5. First available block
 *
 * If the input contains no language blocks, return it as-is
 * (backward compatible with plain text / markdown).
 */
export function parseI18nContent(raw: string | null | undefined, locale: string): string {
    if (!raw || !raw.trim()) return ''

    // Collect all language blocks
    const blocks = new Map<string, string>()
    let match: RegExpExecArray | null
    LANG_BLOCK_RE.lastIndex = 0
    while ((match = LANG_BLOCK_RE.exec(raw)) !== null) {
        blocks.set(match[1], match[2].trim())
    }

    // No language blocks found — return raw text (plain markdown)
    if (blocks.size === 0) return raw.trim()

    // 1. Exact match
    if (blocks.has(locale)) return blocks.get(locale)!

    // 2. Language prefix match (e.g. "zh" for "zh-HK")
    const langPrefix = locale.split(/[-_]/)[0].toLowerCase()
    for (const [key, value] of blocks) {
        if (key.split(/[-_]/)[0].toLowerCase() === langPrefix) return value
    }

    // 3. Fallback to English / Chinese / first available
    for (const key of FALLBACK_ORDER) {
        for (const [blockKey, value] of blocks) {
            if (blockKey.toLowerCase() === key) return value
        }
    }

    // 4. First available block
    return blocks.values().next().value || ''
}
