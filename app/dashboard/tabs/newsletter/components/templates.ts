const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

const footer = `<tr><td style="background-color:#08080e;padding:32px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
<p style="margin:0 0 16px;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:2.4px;font-family:${FONT};">TUM BLOCKCHAIN CLUB</p>
<p style="margin:0 0 14px;color:rgba(255,255,255,0.5);font-size:11px;line-height:1.7;font-family:${FONT};">
TUM Blockchain Club e.V. · Arcisstraße 21, 80333 Munich, Germany<br/>
<a href="mailto:info@tum-blockchain.com" style="color:rgba(255,255,255,0.65);text-decoration:none;">info@tum-blockchain.com</a>
</p>
<p style="margin:0;color:rgba(255,255,255,0.35);font-size:10px;font-family:${FONT};">
<a href="https://www.tum-blockchain.com/imprint" style="color:rgba(255,255,255,0.45);text-decoration:none;">Imprint</a>
&nbsp;·&nbsp;
<a href="%unsubscribe_url%" style="color:rgba(255,255,255,0.45);text-decoration:none;">Unsubscribe</a>
</p>
</td></tr>`

const shell = (inner: string) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050509;margin:0;padding:0;width:100%;">
<tr><td align="center" style="padding:24px 12px;">
<table cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:600px;">
${inner}
${footer}
</table></td></tr></table>`

const cta = (label: string, href = 'https://www.tum-blockchain.com') =>
  `<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#ffffff;border-radius:8px;">
<a href="${href}" style="display:inline-block;padding:13px 26px;color:#050509;text-decoration:none;font-weight:700;font-size:14px;font-family:${FONT};">${label}</a>
</td></tr></table>`

export type Template = {
  id: string
  label: string
  description: string
  html: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Blank campaign',
    description: 'A compact dark starter with headline, body copy and CTA.',
    html: shell(`<tr><td style="background-color:#0e0e16;border-radius:14px 14px 0 0;padding:40px 32px;border:1px solid #1b1b2b;border-bottom:none;">
<p style="color:#8b7cff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;font-family:${FONT};margin:0 0 16px;">TUM Blockchain Club</p>
<h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 16px;font-family:${FONT};line-height:1.25;">Your headline goes here</h1>
<p style="color:rgba(255,255,255,0.72);font-size:15px;line-height:1.75;margin:0 0 26px;font-family:${FONT};">Write the main message of the campaign here. Keep it concise and link to the canonical page for details.</p>
${cta('Call to action')}
</td></tr>`),
  },
  {
    id: 'community-update',
    label: 'Community update',
    description: 'Monthly update layout with one highlighted story.',
    html: shell(`<tr><td style="background-color:#111827;border-radius:14px 14px 0 0;padding:38px 32px;border:1px solid #243044;border-bottom:none;">
<p style="color:#93c5fd;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;font-family:${FONT};margin:0 0 14px;">Community newsletter</p>
<h1 style="color:#ffffff;font-size:27px;font-weight:800;margin:0 0 10px;font-family:${FONT};line-height:1.25;">What's new at TUM Blockchain</h1>
<p style="color:rgba(255,255,255,0.56);font-size:13px;margin:0;font-family:${FONT};">Edition · Month 2026</p>
</td></tr>
<tr><td style="background-color:#0e0e16;padding:32px;border-left:1px solid #1b1b2b;border-right:1px solid #1b1b2b;">
<p style="color:rgba(255,255,255,0.78);font-size:15px;line-height:1.75;margin:0 0 22px;font-family:${FONT};">Hey everyone, here are the most important updates from our teams and programs.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="border:1px solid #273244;border-radius:10px;padding:18px 20px;">
<p style="color:#93c5fd;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;font-family:${FONT};margin:0 0 6px;">Highlight</p>
<h2 style="color:#ffffff;font-size:18px;font-weight:750;font-family:${FONT};margin:0 0 6px;">Top story title</h2>
<p style="color:rgba(255,255,255,0.62);font-size:14px;line-height:1.6;font-family:${FONT};margin:0;">A short teaser for the most important update of this edition.</p>
</td></tr></table>
${cta('Read more')}
</td></tr>`),
  },
]
