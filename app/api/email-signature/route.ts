import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  GMAIL_PROVIDER_TOKEN_COOKIE,
  GMAIL_PROVIDER_TOKEN_COOKIE_PATH,
} from '@/lib/email-signature/constants'
import { GmailSettingsError, updateGmailSignature } from '@/lib/email-signature/gmail'
import { parseSignatureInput, SignatureValidationError } from '@/lib/email-signature/signature'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const clearProviderToken = (response: NextResponse) => {
  response.cookies.set(GMAIL_PROVIDER_TOKEN_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: GMAIL_PROVIDER_TOKEN_COOKIE_PATH,
    sameSite: 'lax',
  })
  return response
}

const json = (body: object, status: number) =>
  clearProviderToken(NextResponse.json(body, { status }))

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Invalid request origin.' }, 403)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return json({ error: 'Sign in before updating your signature.' }, 401)
    }

    const { data: member, error: memberError } = await supabase
      .from('members_main')
      .select('id')
      .ilike('TBC Email', user.email)
      .maybeSingle()

    if (memberError || !member) {
      return json({ error: 'No member profile was found for this account.' }, 403)
    }

    const cookieStore = await cookies()
    const providerToken = cookieStore.get(GMAIL_PROVIDER_TOKEN_COOKIE)?.value

    if (!providerToken) {
      return json({ error: 'Authorize Gmail before updating your signature.' }, 401)
    }

    const input = parseSignatureInput(await request.json())
    const result = await updateGmailSignature({
      accessToken: providerToken,
      input,
      userEmail: user.email,
    })

    return json({ email: result.email }, 200)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid signature details.' }, 400)
    }
    if (error instanceof SignatureValidationError) {
      return json({ error: error.message }, 400)
    }
    if (error instanceof GmailSettingsError) {
      return json({ error: error.message }, error.status)
    }

    console.error('Failed to update Gmail signature', error)
    return json({ error: 'Could not update your signature. Please try again.' }, 500)
  }
}
