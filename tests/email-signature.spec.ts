import { expect, test } from '@playwright/test'
import {
  findMatchingSendAsAlias,
  parseSignatureInput,
  renderEmailSignature,
  SignatureValidationError,
} from '@/lib/email-signature/signature'

const validInput = {
  fullName: 'Nikolas Hack',
  jobDescription: 'Head of IT & Development',
  linkedinUrl: 'https://www.linkedin.com/in/nikolas-hack/',
  mobileNumber: '+49 123 4567890',
}

test('validates and normalizes signature details', () => {
  expect(parseSignatureInput({
    ...validInput,
    fullName: '  Nikolas Hack  ',
  })).toEqual(validInput)
})

test('rejects non-LinkedIn and malformed mobile values', () => {
  expect(() => parseSignatureInput({
    ...validInput,
    linkedinUrl: 'https://example.com/profile',
  })).toThrow(SignatureValidationError)

  expect(() => parseSignatureInput({
    ...validInput,
    mobileNumber: 'call me',
  })).toThrow(SignatureValidationError)
})

test('escapes member-controlled content in generated HTML', () => {
  const html = renderEmailSignature({
    ...validInput,
    fullName: '<img src=x onerror=alert(1)>',
    jobDescription: 'IT & Development',
  }, 'nikolas.hack@tum-blockchain.com')

  expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  expect(html).toContain('IT &amp; Development')
  expect(html).not.toContain('<img src=x onerror=alert(1)>')
  expect(html).toContain('tel:+491234567890')
})

test('only selects the Gmail alias matching the signed-in platform account', () => {
  const aliases = [
    { sendAsEmail: 'other@example.com', isPrimary: true },
    { sendAsEmail: 'Nikolas.Hack@tum-blockchain.com', isDefault: true },
  ]

  expect(findMatchingSendAsAlias(aliases, 'nikolas.hack@tum-blockchain.com')).toEqual(aliases[1])
  expect(findMatchingSendAsAlias(aliases, 'missing@tum-blockchain.com')).toBeNull()
})
