import type { CompatIssue } from './types'

export const COMPAT_RULES: CompatIssue[] = [
  { id: 'style',    level: 'high',   icon: '🚫', title: '<style> block found',       desc: 'Gmail removes <style> blocks. All styles must be inlined.' },
  { id: 'script',   level: 'high',   icon: '🚫', title: '<script> tag found',        desc: 'JavaScript is blocked by all email clients.' },
  { id: 'forms',    level: 'high',   icon: '🚫', title: 'Form elements',             desc: '<form>, <input> etc. do not work in emails.' },
  { id: 'video',    level: 'high',   icon: '🚫', title: 'Video / Audio / iFrame',    desc: 'Removed by email clients.' },
  { id: 'vars',     level: 'medium', icon: '⚠️', title: 'CSS variables (var(--))',   desc: 'Not supported in Outlook and older clients.' },
  { id: 'flex',     level: 'medium', icon: '⚠️', title: 'display:flex / grid',       desc: 'Limited support. Use table-based layout.' },
  { id: 'fonts',    level: 'medium', icon: '⚠️', title: 'Google Fonts',              desc: 'Often not loaded in Outlook/mobile. Add system-font fallback.' },
  { id: 'position', level: 'medium', icon: '⚠️', title: 'position:fixed / absolute', desc: 'Not supported in email clients.' },
  { id: 'bgimg',    level: 'low',    icon: 'ℹ️', title: 'background-image',          desc: 'Not shown in Outlook. Add a fallback color.' },
  { id: 'svg',      level: 'low',    icon: 'ℹ️', title: 'Inline SVG',                desc: 'Outlook ignores SVG. Use PNG as fallback.' },
  { id: 'b64',      level: 'medium', icon: '⚠️', title: 'Base64 images',             desc: 'Gmail blocks base64-encoded images. Use HTTPS URLs.' },
  { id: 'scheme',   level: 'medium', icon: '⚠️', title: 'Dark mode meta tag missing', desc: 'Gmail may auto-convert your design to dark mode.', invert: true },
]

const PATTERNS: Record<string, RegExp> = {
  style:    /<style[\s>]/i,
  script:   /<script[\s>]/i,
  forms:    /<(form|input|select|textarea)\b/i,
  video:    /<(video|audio|iframe)\b/i,
  vars:     /var\(--/i,
  flex:     /display\s*:\s*(flex|grid)/i,
  fonts:    /fonts\.googleapis\.com/i,
  position: /position\s*:\s*(fixed|absolute)/i,
  bgimg:    /background-image\s*:/i,
  svg:      /<svg\b/i,
  b64:      /src="data:image\//i,
  scheme:   /color-scheme["\s]*content="[^"]*light/i,
}

export function runCompatCheck(html: string): CompatIssue[] {
  return COMPAT_RULES.filter((rule) => {
    const pattern = PATTERNS[rule.id]
    if (!pattern) return false
    return rule.invert ? !pattern.test(html) : pattern.test(html)
  })
}
