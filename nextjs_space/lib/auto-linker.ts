/**
 * Auto-linker utility: Scans HTML content and converts matching keywords
 * into internal links for SEO purposes.
 *
 * Rules:
 * - Only the FIRST occurrence of each keyword is linked per page
 * - Text already inside <a> tags is never double-linked
 * - Case-insensitive matching (Turkish locale)
 * - Longer phrases are matched before shorter ones to avoid partial matches
 */

export interface KeywordLink {
  keywords: string[];   // variations / synonyms
  href: string;
  title?: string;       // optional title attribute for the <a>
}

const KEYWORD_MAP: KeywordLink[] = [
  // Multi-word phrases first (order matters – longest match wins)
  { keywords: ['melek kartları', 'melek kartı'], href: '/fallar/melek-kartlari', title: 'Melek Kartları Falı' },
  { keywords: ['doğum haritası'], href: '/fallar/dogum-haritasi', title: 'Doğum Haritası' },
  { keywords: ['aşk uyumu', 'aşk uyum'], href: '/fallar/ask-uyumu', title: 'Aşk Uyumu' },
  { keywords: ['el falı'], href: '/fallar/el-fali', title: 'El Falı' },
  { keywords: ['kahve falı', 'türk kahvesi falı'], href: '/fallar/kahve-fali', title: 'Kahve Falı' },
  { keywords: ['tarot falı'], href: '/fallar/tarot-fali', title: 'Tarot Falı' },
  { keywords: ['burç yorumu', 'burç yorumları'], href: '/fallar/burc-yorumu', title: 'Burç Yorumu' },
  { keywords: ['canlı falcı', 'canlı falcılar'], href: '/canli-falcilar', title: 'Canlı Falcılar' },
  { keywords: ['canlı yayın'], href: '/sohbet/video', title: 'Canlı Yayın' },
  { keywords: ['rüya tabiri', 'rüya tabirleri'], href: '/ruya', title: 'Rüya Tabiri' },

  // Single-word keywords (checked after multi-word)
  { keywords: ['tarot'], href: '/fallar/tarot-fali', title: 'Tarot Falı' },
  { keywords: ['kahve'], href: '/fallar/kahve-fali', title: 'Kahve Falı' },
  { keywords: ['numeroloji'], href: '/fallar/numeroloji', title: 'Numeroloji' },
  { keywords: ['rüya'], href: '/ruya', title: 'Rüya Tabiri' },
  { keywords: ['sohbet'], href: '/sohbet', title: 'Sohbet' },
  { keywords: ['oyun', 'oyunlar'], href: '/oyunlar', title: 'Oyunlar' },
  { keywords: ['hediye', 'hediyeler'], href: '/hediyeler', title: 'Hediyeler' },
  { keywords: ['blog'], href: '/blog', title: 'Blog' },
  { keywords: ['burç'], href: '/fallar/burc-yorumu', title: 'Burç Yorumu' },
];

/**
 * Replaces the first occurrence of each keyword in the HTML content
 * with an internal link, while skipping text inside existing <a> tags.
 */
export function addInternalLinks(html: string): string {
  if (!html) return html;

  // Split HTML into segments: inside <a>...</a> tags vs outside.
  // We only modify text that is OUTSIDE anchor tags.
  const parts = splitByAnchors(html);

  const linkedHrefs = new Set<string>(); // track which links we already inserted

  for (const entry of KEYWORD_MAP) {
    if (linkedHrefs.has(entry.href)) continue; // already linked this destination

    let matched = false;

    // Try each keyword variation (longest first – they are already ordered in the array)
    for (const keyword of entry.keywords) {
      if (matched) break;

      // Build a regex that matches the keyword as a whole word (Turkish-safe)
      const escaped = escapeRegex(keyword);
      const re = new RegExp(`(?<![\\wğüşöçıİĞÜŞÖÇ])(${escaped})(?![\\wğüşöçıİĞÜŞÖÇ])`, 'iu');

      for (let i = 0; i < parts.length; i++) {
        if (parts[i].isAnchor) continue; // skip content inside <a> tags
        if (parts[i].isTag) continue;     // skip HTML tags

        const m = re.exec(parts[i].text);
        if (m) {
          const before = parts[i].text.slice(0, m.index);
          const matchedText = m[0];
          const after = parts[i].text.slice(m.index + matchedText.length);

          const titleAttr = entry.title ? ` title="${entry.title}"` : '';
          const link = `<a href="${entry.href}"${titleAttr} class="auto-link">${matchedText}</a>`;

          // Replace this part with three segments
          parts.splice(i, 1,
            { text: before, isAnchor: false, isTag: false },
            { text: link, isAnchor: true, isTag: false },  // mark as anchor so it won't be processed again
            { text: after, isAnchor: false, isTag: false }
          );

          linkedHrefs.add(entry.href);
          matched = true;
          break;
        }
      }
    }
  }

  return parts.map(p => p.text).join('');
}

interface HtmlSegment {
  text: string;
  isAnchor: boolean;  // true if inside <a>...</a>
  isTag: boolean;     // true if it's an HTML tag itself (not text content)
}

/**
 * Splits HTML into segments, marking which parts are inside anchor tags
 * and which parts are HTML tags (so we don't inject links into tag attributes).
 */
function splitByAnchors(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];

  // Match: <a ...>...</a> (including nested content) OR any other HTML tag OR text between tags
  const regex = /(<a\s[^>]*>[\s\S]*?<\/a>)|(<[^>]+>)|([^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      // Full anchor tag with content – don't touch
      segments.push({ text: match[1], isAnchor: true, isTag: false });
    } else if (match[2]) {
      // Other HTML tag – don't inject into attributes
      segments.push({ text: match[2], isAnchor: false, isTag: true });
    } else if (match[3]) {
      // Plain text – candidate for linking
      segments.push({ text: match[3], isAnchor: false, isTag: false });
    }
  }

  return segments;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
