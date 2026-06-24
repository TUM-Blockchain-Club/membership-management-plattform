const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

const TBC_SOCIALS: [string, string][] = [
  ['X', 'https://twitter.com/tbc_munich'],
  ['Instagram', 'https://www.instagram.com/tumblockchain/'],
  ['LinkedIn', 'https://www.linkedin.com/company/tum-blockchain-club/'],
  ['Discord', 'https://discord.gg/7V7KG8SESF'],
  ['Telegram', 'https://t.me/+6SMYu7pub0E1MGUy'],
  ['GitHub', 'https://github.com/TUM-Blockchain-Club'],
  ['Medium', 'https://medium.com/@tumblockchainclub'],
]

const WEB3_SOCIALS: [string, string][] = [
  ['LinkedIn', 'https://www.linkedin.com/company/web-3-talents'],
  ['Instagram', 'https://www.instagram.com/web3talents/'],
  ['X', 'https://twitter.com/TalentsWeb3'],
]

const socialLinks = (arr: [string, string][]) =>
  arr
    .map(
      ([label, url]) =>
        `<a href="${url}" style="color:rgba(255,255,255,0.55);text-decoration:none;font-size:12px;font-weight:600;font-family:${FONT};display:inline-block;margin:0 8px;">${label}</a>`
    )
    .join('')

const makeFooter = ({
  wordmark,
  socials,
  website,
  websiteLabel,
}: {
  wordmark: string
  socials: [string, string][]
  website: string
  websiteLabel: string
}) =>
  `<tr><td style="background-color:#08080e;padding:38px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);">
<div style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:3px;font-family:${FONT};margin:0 0 18px;">${wordmark}</div>
<p style="margin:0 0 20px;line-height:2.2;">${socialLinks(socials)}</p>
<p style="color:rgba(255,255,255,0.38);font-size:11px;line-height:1.7;margin:0 0 10px;font-family:${FONT};">
TUM Blockchain Club e.V. &nbsp;·&nbsp; Arcisstraße 21, 80333 Munich, Germany<br/>
Register Court Munich · VR 210111 · VAT DE365534593<br/>
<a href="mailto:info@tum-blockchain.com" style="color:rgba(255,255,255,0.55);text-decoration:none;">info@tum-blockchain.com</a>
</p>
<p style="color:rgba(255,255,255,0.28);font-size:10px;margin:0;font-family:${FONT};">
<a href="https://www.tum-blockchain.com/imprint" style="color:rgba(255,255,255,0.4);text-decoration:none;">Imprint</a>
&nbsp;·&nbsp;
<a href="${website}" style="color:rgba(255,255,255,0.4);text-decoration:none;">${websiteLabel}</a>
&nbsp;·&nbsp;
<a href="%unsubscribe_url%" style="color:rgba(255,255,255,0.4);text-decoration:none;">Unsubscribe</a>
</p>
</td></tr>`

const TBC_FOOTER = makeFooter({
  wordmark: 'TUM BLOCKCHAIN CLUB',
  socials: TBC_SOCIALS,
  website: 'https://www.tum-blockchain.com',
  websiteLabel: 'tum-blockchain.com',
})

const WEB3_FOOTER = makeFooter({
  wordmark: 'WEB3 TALENTS',
  socials: WEB3_SOCIALS,
  website: 'https://www.web3-talents.com',
  websiteLabel: 'web3-talents.com',
})

const shell = (inner: string, footer = TBC_FOOTER) =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050509;margin:0;padding:0;width:100%;">
<tr><td align="center" style="padding:24px 12px;">
<table cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:600px;">
${inner}
${footer}
</table></td></tr></table>`

const statTiles = (tiles: [string, string][], bg: string, brd: string) =>
  `<div style="text-align:center;font-size:0;margin:0 0 28px;">${tiles
    .map(
      ([big, small]) =>
        `<div style="display:inline-block;width:31%;min-width:140px;vertical-align:top;margin:0 1% 10px;background:${bg};${brd ? `border:1px solid ${brd};` : ''}border-radius:12px;padding:16px 4px;box-sizing:border-box;">
<div style="color:#ffffff;font-size:21px;font-weight:800;font-family:${FONT};line-height:1.1;">${big}</div>
<div style="color:rgba(255,255,255,0.5);font-size:10px;font-family:${FONT};margin-top:3px;">${small}</div>
</div>`
    )
    .join('')}</div>`

export type Template = {
  id: string
  icon: string
  label: string
  desc: string
  html: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    icon: '⬜',
    label: 'Blank',
    desc: 'Minimal dark starter',
    html: shell(`<tr><td style="background-color:#0e0e16;border-radius:16px 16px 0 0;padding:40px 32px;border:1px solid #1b1b2b;border-bottom:none;">
<div style="color:#7c6af7;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:${FONT};margin:0 0 16px;">TUM Blockchain Club</div>
<h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 16px;font-family:${FONT};line-height:1.25;">Your headline goes here</h1>
<p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.75;margin:0 0 28px;font-family:${FONT};">Start writing your message here. Drag blocks from the right panel to build your email.</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#7c6af7;border-radius:10px;">
<a href="https://www.tum-blockchain.com" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:${FONT};">Call to action →</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#0e0e16;height:24px;border-left:1px solid #1b1b2b;border-right:1px solid #1b1b2b;"></td></tr>`),
  },
  {
    id: 'newsletter',
    icon: '📰',
    label: 'Newsletter',
    desc: 'Monthly community update',
    html: shell(`<tr><td style="background:linear-gradient(135deg,#1a1040 0%,#0f0f2e 100%);border-radius:16px 16px 0 0;padding:40px 32px 34px;text-align:center;border:1px solid #20204a;border-bottom:none;">
<div style="color:#a89eff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:${FONT};margin:0 0 14px;">Community Newsletter</div>
<h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 10px;font-family:${FONT};line-height:1.2;">What's new at TUM Blockchain</h1>
<p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;font-family:${FONT};">Edition · Month 2026</p>
</td></tr>
<tr><td style="background-color:#0e0e16;padding:36px 32px;border-left:1px solid #1b1b2b;border-right:1px solid #1b1b2b;">
<p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.75;margin:0 0 22px;font-family:${FONT};">Hey there,</p>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.75;margin:0 0 26px;font-family:${FONT};">Here's what happened this month across our education, industry, research and talent programs.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
<tr><td style="border:1px solid #1f1f33;border-radius:12px;padding:20px 22px;">
<div style="color:#7c6af7;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:${FONT};margin:0 0 6px;">Highlight</div>
<div style="color:#ffffff;font-size:17px;font-weight:700;font-family:${FONT};margin:0 0 6px;">Your top story title</div>
<div style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;font-family:${FONT};">A short teaser describing the most important update of this edition.</div>
</td></tr></table>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:#7c6af7;border-radius:10px;">
<a href="https://www.tum-blockchain.com" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:${FONT};">Read more →</a>
</td></tr></table>
</td></tr>`),
  },
  {
    id: 'blocksprint',
    icon: '⚡',
    label: 'BlockSprint',
    desc: 'Industry projects program',
    html: shell(`<tr><td style="background:linear-gradient(160deg,#0f0f1a 0%,#1a0f3a 55%,#0f1a3a 100%);border-radius:16px 16px 0 0;padding:40px 32px 36px;text-align:center;border:1px solid #20204a;border-bottom:none;">
<img src="https://raw.githubusercontent.com/amelie81/assets/main/tbc-blocksprint-logo-white.png" alt="BlockSprint" width="200" style="width:200px;max-width:80%;height:auto;margin:0 auto 24px;display:block;" />
<div style="display:inline-block;background:rgba(124,106,247,0.16);border:1px solid rgba(124,106,247,0.35);border-radius:20px;padding:6px 16px;margin:0 0 20px;">
<span style="color:#a89eff;font-size:11px;font-weight:700;letter-spacing:1.5px;font-family:${FONT};text-transform:uppercase;">Industry Projects · Summer 2026</span>
</div>
<h1 style="color:#ffffff;font-size:30px;font-weight:800;margin:0 0 14px;font-family:${FONT};line-height:1.2;">Build real Web3<br/>products with industry</h1>
<p style="color:rgba(255,255,255,0.62);font-size:15px;margin:0;font-family:${FONT};line-height:1.6;">3–6 months · 15–20 hrs/week · up to €26/hour</p>
</td></tr>
<tr><td style="background-color:#0e0e16;padding:36px 32px;border-left:1px solid #1b1b2b;border-right:1px solid #1b1b2b;">
<p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.75;margin:0 0 22px;font-family:${FONT};">Hi there,</p>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.75;margin:0 0 26px;font-family:${FONT};"><strong style="color:#fff;">BlockSprint</strong> connects top student talent with industry leaders to ship real Web3 products.</p>
${statTiles([['€26', 'per hour'], ['2–4', 'students/team'], ['3–6', 'months']], 'rgba(124,106,247,0.08)', 'rgba(124,106,247,0.2)')}
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:linear-gradient(135deg,#7c6af7,#5b4dd4);border-radius:10px;">
<a href="https://industry.tum-blockchain.com" style="display:inline-block;padding:16px 36px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:${FONT};letter-spacing:.3px;">Apply now →</a>
</td></tr></table>
</td></tr>`),
  },
  {
    id: 'web3talents',
    icon: '🎓',
    label: 'Web3 Talents',
    desc: '20-week education program',
    html: shell(
      `<tr><td style="background-color:#000000;border-radius:16px 16px 0 0;padding:44px 32px 34px;text-align:center;border:1px solid #1a1a1a;border-bottom:none;">
<img src="https://raw.githubusercontent.com/amelie81/assets/main/web3-talents-logo.png" alt="Web3 Talents" width="240" style="width:240px;max-width:75%;height:auto;margin:0 auto 26px;display:block;" />
<h1 style="color:#ffffff;font-size:30px;font-weight:800;margin:0 0 14px;font-family:${FONT};line-height:1.22;">Start your career<br/>in Web3</h1>
<p style="color:rgba(255,255,255,0.55);font-size:15px;margin:0;font-family:${FONT};line-height:1.6;">A 20-week program. Fully online.</p>
</td></tr>
<tr><td style="background-color:#0a0a0a;padding:36px 32px;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;">
<p style="color:rgba(255,255,255,0.78);font-size:15px;line-height:1.75;margin:0 0 24px;font-family:${FONT};">Learn blockchain fundamentals, smart contracts and DeFi from expert speakers.</p>
${statTiles([['20', 'weeks'], ['100%', 'online'], ['TUM', 'certificate']], 'rgba(255,255,255,0.04)', '')}
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:#ffffff;border-radius:10px;">
<a href="https://www.web3-talents.com" style="display:inline-block;padding:15px 36px;color:#000000;text-decoration:none;font-weight:700;font-size:15px;font-family:${FONT};">Apply now →</a>
</td></tr></table>
</td></tr>`,
      WEB3_FOOTER
    ),
  },
  {
    id: 'event',
    icon: '🎟️',
    label: 'Event',
    desc: 'Event announcement',
    html: shell(`<tr><td style="background:linear-gradient(135deg,#7c6af7 0%,#5b4dd4 100%);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
<div style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:${FONT};margin:0 0 16px;">You're invited</div>
<h1 style="color:#ffffff;font-size:32px;font-weight:800;margin:0 0 16px;font-family:${FONT};line-height:1.2;">Event name here</h1>
<p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;font-family:${FONT};line-height:1.7;">📅 Date &nbsp;·&nbsp; 🕖 Time &nbsp;·&nbsp; 📍 Location</p>
</td></tr>
<tr><td style="background-color:#0e0e16;padding:36px 32px;border-left:1px solid #1b1b2b;border-right:1px solid #1b1b2b;">
<p style="color:rgba(255,255,255,0.78);font-size:16px;line-height:1.75;margin:0 0 26px;font-family:${FONT};">Tell your guests what this event is about and why they won't want to miss it.</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:#7c6af7;border-radius:10px;">
<a href="https://www.tum-blockchain.com" style="display:inline-block;padding:15px 36px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:${FONT};">RSVP now →</a>
</td></tr></table>
</td></tr>`),
  },
]
