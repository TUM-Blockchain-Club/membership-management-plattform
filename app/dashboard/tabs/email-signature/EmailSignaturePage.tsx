'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2Icon, InfoIcon, MailCheckIcon, ShieldCheckIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { DashboardMember } from '@/app/components/dashboard/types'
import { auth } from '@/lib/auth'
import {
  parseSignatureInput,
  renderEmailSignature,
  type SignatureInput,
} from '@/lib/email-signature/signature'

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'authorizing' }
  | { state: 'authorized' }
  | { state: 'updating' }
  | { state: 'success'; email: string }
  | { state: 'error'; message: string }

const defaultJobDescription = (member: DashboardMember | null) => {
  const role = member?.Role?.trim()
  const department = member?.Department?.trim()
  if (role && department) return `${role} · ${department}`
  return role || department || ''
}

const defaultSignature = (member: DashboardMember | null): SignatureInput => ({
  fullName: member?.Name?.trim() ?? '',
  jobDescription: defaultJobDescription(member),
  linkedinUrl: member?.Linkedin?.trim() ?? '',
  mobileNumber: member?.Phone?.trim() ?? '',
})

const readResponse = async (response: Response) => {
  const body = await response.json().catch(() => null) as { email?: string; error?: string } | null
  if (!response.ok || !body?.email) {
    throw new Error(body?.error || 'Could not update your signature. Please try again.')
  }
  return body.email
}

export function EmailSignaturePage({ member }: { member: DashboardMember | null }) {
  const [form, setForm] = useState<SignatureInput>(() => defaultSignature(member))
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const resumedAuthorization = useRef(false)
  const email = member?.['TBC Email']?.trim() ?? ''

  const previewHtml = useMemo(() => {
    try {
      return renderEmailSignature(parseSignatureInput(form), email || 'you@tum-blockchain.com')
    } catch {
      return null
    }
  }, [email, form])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const gmailResult = searchParams.get('gmail')
    if (!gmailResult || resumedAuthorization.current) return
    resumedAuthorization.current = true
    window.history.replaceState(null, '', window.location.pathname)

    const finishAuthorization = async () => {
      if (gmailResult !== 'authorized') {
        setStatus({
          state: 'error',
          message: 'Google authorization was cancelled. No Gmail settings were changed.',
        })
        return
      }
      setStatus({ state: 'authorized' })
    }

    void finishAuthorization()
  }, [])

  const setField = (field: keyof SignatureInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (status.state === 'success') {
      setStatus({ state: 'idle' })
    }
  }

  const handleAuthorization = async () => {
    try {
      setStatus({ state: 'authorizing' })
      const { error } = await auth.authorizeGmailSignature()
      if (error) throw error
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not start Google authorization.',
      })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status.state !== 'authorized') return

    try {
      const parsed = parseSignatureInput(form)
      setStatus({ state: 'updating' })
      const response = await fetch('/api/email-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const updatedEmail = await readResponse(response)
      setStatus({ state: 'success', email: updatedEmail })
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not update your signature.',
      })
    }
  }

  const busy = status.state === 'authorizing' || status.state === 'updating'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <MailCheckIcon className="size-4" />
            Gmail settings
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Email signature
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create the official club signature from your member profile and install it directly in Gmail.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 text-emerald-400" />
          Google access is short-lived and never saved
        </div>
      </div>

      {status.state === 'success' && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2Icon />
          <AlertTitle>Signature updated</AlertTitle>
          <AlertDescription className="text-emerald-200/80">
            Gmail now uses the new signature for {status.email}.
          </AlertDescription>
        </Alert>
      )}

      {status.state === 'error' && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
          <InfoIcon />
          <AlertTitle>Update failed</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>Signature details</CardTitle>
            <CardDescription>
              We prefilled these fields from your profile. Changes here only affect your Gmail signature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={status.state !== 'authorized'} className="disabled:opacity-60">
                <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="signature-full-name">Full name</FieldLabel>
                  <Input
                    id="signature-full-name"
                    name="fullName"
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.target.value)}
                  />
                  <FieldDescription>Use your full name as it should appear in business emails.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="signature-job-description">Role and department</FieldLabel>
                  <Input
                    id="signature-job-description"
                    name="jobDescription"
                    maxLength={180}
                    required
                    value={form.jobDescription}
                    onChange={(event) => setField('jobDescription', event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="signature-linkedin">LinkedIn profile URL</FieldLabel>
                  <Input
                    id="signature-linkedin"
                    name="linkedinUrl"
                    type="url"
                    inputMode="url"
                    maxLength={300}
                    placeholder="https://www.linkedin.com/in/..."
                    value={form.linkedinUrl}
                    onChange={(event) => setField('linkedinUrl', event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="signature-mobile">Mobile number</FieldLabel>
                  <Input
                    id="signature-mobile"
                    name="mobileNumber"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={40}
                    placeholder="+49 123 4567890"
                    value={form.mobileNumber}
                    onChange={(event) => setField('mobileNumber', event.target.value)}
                  />
                </Field>

                  <Button type="submit" size="lg" disabled={busy || !member} className="w-full">
                    {status.state === 'updating' && <Spinner data-icon="inline-start" />}
                    {status.state === 'updating' ? 'Updating signature…' : 'Update Gmail signature'}
                  </Button>
                </FieldGroup>
              </fieldset>

              {status.state !== 'authorized' && status.state !== 'updating' && (
                <div className="mt-5 flex flex-col gap-3">
                  <Alert className="border-primary/20 bg-primary/5">
                    <InfoIcon />
                    <AlertTitle>Connect Gmail first</AlertTitle>
                    <AlertDescription>
                      Google checks the Gmail settings permission before the form is unlocked. Your form details are not stored during the redirect.
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    size="lg"
                    disabled={status.state === 'authorizing' || !member}
                    className="w-full"
                    onClick={() => void handleAuthorization()}
                  >
                    {status.state === 'authorizing' && <Spinner data-icon="inline-start" />}
                    {status.state === 'authorizing' ? 'Opening Google…' : 'Connect Gmail'}
                  </Button>
                </div>
              )}

              {status.state === 'authorized' && (
                <Alert className="mt-5 border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheckIcon />
                  <AlertTitle>Gmail connected</AlertTitle>
                  <AlertDescription className="text-emerald-200/80">
                    Permission is ready for this update. Review the unlocked form and submit it.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit border-border/80 bg-card/90 lg:sticky lg:top-36">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Gmail may apply small spacing differences when composing a message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              {previewHtml ? (
                <iframe
                  title="Email signature preview"
                  srcDoc={`<!doctype html><html><body style="margin:24px">${previewHtml}</body></html>`}
                  sandbox=""
                  className="h-[310px] w-full bg-white"
                />
              ) : (
                <div className="flex h-[310px] items-center justify-center px-8 text-center text-sm text-neutral-500">
                  Complete all fields to see the signature preview.
                </div>
              )}
            </div>
            {email && (
              <p className="mt-3 text-xs text-muted-foreground">
                The signature will be installed for <span className="text-foreground">{email}</span>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
