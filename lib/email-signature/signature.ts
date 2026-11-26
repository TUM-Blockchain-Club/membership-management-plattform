export type SignatureInput = {
  fullName: string
  jobDescription: string
  linkedinUrl: string
  mobileNumber: string
}

export type GmailSendAsAlias = {
  sendAsEmail?: string
  isPrimary?: boolean
  isDefault?: boolean
}

export class SignatureValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignatureValidationError'
  }
}

const FIELD_LIMITS = {
  fullName: 120,
  jobDescription: 180,
  linkedinUrl: 300,
  mobileNumber: 40,
} as const

const requireString = (
  record: Record<string, unknown>,
  field: keyof SignatureInput,
  label: string,
) => {
  const value = record[field]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SignatureValidationError(`${label} is required.`)
  }

  const trimmed = value.trim()
  if (trimmed.length > FIELD_LIMITS[field]) {
    throw new SignatureValidationError(`${label} is too long.`)
  }

  return trimmed
}

const optionalString = (
  record: Record<string, unknown>,
  field: 'linkedinUrl' | 'mobileNumber',
  label: string,
) => {
  const value = record[field]
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') {
    throw new SignatureValidationError(`${label} must be text.`)
  }

  const trimmed = value.trim()
  if (trimmed.length > FIELD_LIMITS[field]) {
    throw new SignatureValidationError(`${label} is too long.`)
  }
  return trimmed
}

const parseLinkedInUrl = (value: string) => {
  if (!value) return ''
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SignatureValidationError('Enter a valid LinkedIn URL.')
  }

  const hostname = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com'))) {
    throw new SignatureValidationError('Use an HTTPS link to linkedin.com.')
  }

  return url.toString()
}

const parseMobileNumber = (value: string) => {
  if (!value) return ''
  if (!/^[+()\d\s./-]+$/.test(value) || value.replace(/\D/g, '').length < 6) {
    throw new SignatureValidationError('Enter a valid mobile number including the country code.')
  }
  return value
}

export const parseSignatureInput = (value: unknown): SignatureInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SignatureValidationError('Invalid signature details.')
  }

  const record = value as Record<string, unknown>
  const fullName = requireString(record, 'fullName', 'Full name')
  const jobDescription = requireString(record, 'jobDescription', 'Job description')
  const linkedinUrl = parseLinkedInUrl(optionalString(record, 'linkedinUrl', 'LinkedIn URL'))
  const mobileNumber = parseMobileNumber(optionalString(record, 'mobileNumber', 'Mobile number'))

  return { fullName, jobDescription, linkedinUrl, mobileNumber }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })

const toTelephoneHref = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return value.trim().startsWith('+') ? `+${digits}` : digits
}

export const renderEmailSignature = (input: SignatureInput, userEmail: string) => {
  const fullName = escapeHtml(input.fullName)
  const jobDescription = escapeHtml(input.jobDescription)
  const linkedinUrl = escapeHtml(input.linkedinUrl)
  const mobileNumber = escapeHtml(input.mobileNumber)
  const telephoneHref = escapeHtml(toTelephoneHref(input.mobileNumber))
  const email = escapeHtml(userEmail.trim().toLowerCase())
  const name = input.linkedinUrl
    ? `<a href="${linkedinUrl}" style="text-decoration: none;">
          <span style="color: #1c1f2a;"><strong>${fullName}</strong></span>
          <img src="https://ci3.googleusercontent.com/meips/ADKq_Nb_PFDLWq7mk5z2yZzePwPvdm1L-9hslk3FOCefht4GcyZOQB2nonoN53UWAP6jpHBnQqMwcH867KLbaeOBaTBURMnkuLd04F81jcvXYOXeafFmwBdHywxu-SOsej-WH-5LCpgA_RpgE-lpqRHo6wMlmwaFeqmW6SP9Nco=s0-d-e1-ft#https://cdn.prod.website-files.com/631ad94cbdadc40fe03d6458/6710295ddb650b08a2d16b05_linkedin-icon.png" style="width:16px; height:16px; vertical-align:middle; margin-left: 5px; border:0;" alt="LinkedIn Profile">
        </a>`
    : `<span style="color: #1c1f2a;"><strong>${fullName}</strong></span>`
  const mobileRow = input.mobileNumber
    ? `<tr><td><span>Mobile: </span><a href="tel:${telephoneHref}" style="color: #8f73ff; text-decoration: none;">${mobileNumber}</a></td></tr>`
    : ''

  return `<table style="padding: 0; margin: 0; border-collapse: collapse; font-family: Arial, sans-serif; color: #161622; font-size: 14px; line-height: 1.4;">
  <tbody>
    <tr>
      <td>
        ${name}
      </td>
    </tr>
    <tr><td style="color: #1c1f2a; padding-top: 2px;">${jobDescription}</td></tr>
    <tr>
      <td>
        <a href="https://www.tum-blockchain.com/" target="_blank">
          <img src="https://ci3.googleusercontent.com/meips/ADKq_NZtUWDXwzVQGfluQExgNI-n7P5zFuBFa5qyeC_p3uPGQJO_fOt_52UYgsqfxGnW6O9uvfqe9O3yVzkmpCrwEGAkwDSxJxYvgAdJrX6BZEGdSK54pNo8NmZQFoa2YBPEFxF3O0m6HD-NL0gegeHmQ9HihGiP8EEJ2PV7YwJ3-NKS_A=s0-d-e1-ft#https://cdn.prod.website-files.com/631ad94cbdadc40fe03d6458/6710295d8e930339d8da066f_tbc-wordmark-email.png" style="width: 180px; margin: 10px 0; border:0;" alt="TUM Blockchain Club Logo">
        </a>
      </td>
    </tr>
    ${mobileRow}
    <tr><td><span>Email: </span><a href="mailto:${email}" style="color: #8f73ff; text-decoration: none;">${email}</a></td></tr>
    <tr><td style="padding-top: 15px;"><span style="color: #696E7A; font-size: 12px;">TUM Blockchain Club e.V. | c/o AStA office | Arcisstraße 21 | 80333 Munich | Germany</span></td></tr>
    <tr><td><span style="color: #696E7A; font-size: 12px;">Register court: Munich | Register number: VR210111 | VAT-ID: DE365534593</span></td></tr>
    <tr><td><span style="color: #696E7A; font-size: 12px;">President: Felix Rihacek | Vice President: Kerem Eskici</span></td></tr>
  </tbody>
</table>`
}

export const findMatchingSendAsAlias = (aliases: GmailSendAsAlias[], userEmail: string) => {
  const normalizedUserEmail = userEmail.trim().toLowerCase()
  return aliases.find((alias) => alias.sendAsEmail?.trim().toLowerCase() === normalizedUserEmail) ?? null
}
