/**
 * Google Drive integration for Coffee Chat selfie backups.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL — service account email with Drive write access
 *   GOOGLE_PRIVATE_KEY           — service account private key (PEM, newlines as \n)
 *   GOOGLE_DRIVE_FOLDER_ID       — target Drive folder ID for selfie uploads
 *
 * If any env var is missing the function logs a warning and returns null
 * rather than throwing, so the rest of the log-meeting flow is unaffected.
 */

interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

type DriveImageType = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'jpg' | 'png' | 'webp'
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY')
  }

  const privateKey = rawKey.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Use the Web Crypto API available in the Next.js Edge/Node runtime
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput),
  )

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string }

  if (!tokenData.access_token) {
    throw new Error(`Google OAuth error: ${tokenData.error ?? 'unknown'}`)
  }

  return tokenData.access_token
}

/**
 * Uploads a selfie buffer to the configured Google Drive folder.
 *
 * @param imageBuffer - Raw image bytes
 * @param pairId      - UUID of the cc_pairs row (used in filename)
 * @param month       - Round month string, e.g. "2026-07"
 * @param names       - Display names of the participants
 * @param imageType   - Validated image content type and matching extension
 * @returns Drive file metadata or null if upload is not configured/failed
 */
export async function syncSelfie(
  imageBuffer: Buffer,
  pairId: string,
  month: string,
  names: string[],
  imageType: DriveImageType,
): Promise<DriveUploadResult | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !folderId) {
    console.warn('[coffee-chats/drive] Google Drive not configured — skipping selfie sync')
    return null
  }

  try {
    const accessToken = await getAccessToken()
    const fileName = `coffee-chat-${month}-${names.join('-').replace(/\s+/g, '_').toLowerCase()}-${pairId.slice(0, 8)}.${imageType.extension}`

    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    })

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const body = Buffer.concat([
      Buffer.from(
        `${delimiter}Content-Type: application/json\r\n\r\n${metadata}` +
          `${delimiter}Content-Type: ${imageType.contentType}\r\n\r\n`,
      ),
      imageBuffer,
      Buffer.from(closeDelimiter),
    ])

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': String(body.length),
        },
        body,
      },
    )

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text()
      throw new Error(`Drive upload failed (${uploadResponse.status}): ${errText}`)
    }

    const result = (await uploadResponse.json()) as DriveUploadResult
    return result
  } catch (err) {
    console.warn('[coffee-chats/drive] Selfie sync failed:', err instanceof Error ? err.message : err)
    return null
  }
}
