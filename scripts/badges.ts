/**
 * RepoCensus — Badge SVG Generator
 *
 * Generates shields.io-style flat badges at build time.
 * Output: public/badges/*.svg (copied to dist/ by Vite)
 */

import type { CensusData } from '../src/engine/types'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

function escText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Approximate text width for Verdana 11px */
function textWidth(s: string): number {
  return Math.ceil(s.length * 6.5) + 10
}

function generateBadge(label: string, value: string, color: string): string {
  const labelW = textWidth(label)
  const valueW = textWidth(value)
  const totalW = labelW + valueW
  const labelCenter = Math.round(labelW / 2)
  const valueCenter = Math.round(labelW + valueW / 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="20" role="img" aria-label="${escText(label)}: ${escText(value)}">
  <title>${escText(label)}: ${escText(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
  </g>
  <g clip-path="url(#r)">
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelCenter}" y="14">${escText(label)}</text>
    <text x="${valueCenter}" y="14">${escText(value)}</text>
  </g>
</svg>`
}

export function generateBadges(data: CensusData, outputDir: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const badges: { file: string; label: string; value: string; color: string }[] = [
    { file: 'repos', label: 'repos', value: String(data.stats.total), color: '#007ec6' },
    { file: 'stars', label: 'stars', value: String(data.tech_profile.total_stars_received), color: '#fe7d37' },
    { file: 'health', label: 'health', value: `${data.stats.avg_health}/100`, color: '#4c1' },
    { file: 'active', label: 'active', value: String(data.stats.active_count), color: '#2cbe4e' },
    { file: 'languages', label: 'languages', value: String(data.tech_profile.languages.length), color: '#6f42c1' },
    { file: 'repocensus', label: 'RepoCensus', value: `${data.stats.total} repos`, color: '#0969da' },
  ]

  for (const badge of badges) {
    const svg = generateBadge(badge.label, badge.value, badge.color)
    const filePath = resolve(outputDir, `${badge.file}.svg`)
    writeFileSync(filePath, svg)
  }

  console.log(`\n🏷️  Generated ${badges.length} badges to ${outputDir}`)
}
