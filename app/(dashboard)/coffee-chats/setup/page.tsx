'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { CheckIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { filterKnownMembers, type KnownMemberOption } from '@/lib/coffee-chats/profiles'

const CORE_INTEREST_OPTIONS = [
  'Blockchain', 'DeFi', 'Web3', 'Smart Contracts',
  'Research', 'Finance', 'Software Dev', 'VC & Startups',
] as const

const MORE_INTEREST_OPTIONS = [
  'NFTs', 'Solidity', 'Trading', 'Investing', 'Design', 'Marketing',
  'Legal', 'AI / ML', 'Sports', 'Music', 'Travel', 'Gaming',
] as const

type MemberDirectoryRow = {
  id: number
  Name: string | null
  Department: string | null
}

export default function CoffeeChatsSetupPage() {
  const supabase = getSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  const [interests, setInterests] = useState<string[]>([])
  const [studyProgramme, setStudyProgramme] = useState('')
  const [favouriteCoffee, setFavouriteCoffee] = useState('')
  const [favouriteSpots, setFavouriteSpots] = useState('')
  const [funFact, setFunFact] = useState('')
  const [knownMembers, setKnownMembers] = useState<KnownMemberOption[]>([])
  const [alreadyKnow, setAlreadyKnow] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const filteredKnownMembers = useMemo(
    () => filterKnownMembers(knownMembers, memberSearch),
    [knownMembers, memberSearch],
  )

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [{ data }, { data: members }] = await Promise.all([
        supabase
          .from('members_main')
          .select('id, cc_interests, cc_study_programme, cc_already_know, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
          .ilike('"TBC Email"', user.email ?? '')
          .maybeSingle(),
        supabase
          .from('members_main')
          .select('id, Name, Department')
          .eq('Status', 'Active')
          .order('Name', { ascending: true }),
      ])

      if (data) {
        const currentMemberId = data.id as number
        const directory = ((members ?? []) as MemberDirectoryRow[]).filter(
          (member) => member.id !== currentMemberId,
        )
        const selectableMemberIds = new Set(directory.map((member) => member.id))
        setInterests((data.cc_interests as string[] | null) ?? [])
        setStudyProgramme((data.cc_study_programme as string | null) ?? '')
        setAlreadyKnow(
          ((data.cc_already_know as number[] | null) ?? []).filter((id) =>
            selectableMemberIds.has(id),
          ),
        )
        setFavouriteCoffee((data.cc_favourite_coffee as string | null) ?? '')
        setFavouriteSpots(((data.cc_favourite_spots as string[] | null) ?? []).join(', '))
        setFunFact((data.cc_fun_fact as string | null) ?? '')
        setKnownMembers(
          directory.map((member) => ({
            id: member.id,
            name: member.Name ?? 'Unnamed member',
            department: member.Department,
          })),
        )
      }
      setLoading(false)
    }
    void loadProfile()
  }, [supabase])

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  function toggleKnownMember(memberId: number, checked: boolean) {
    setAlreadyKnow((current) =>
      checked
        ? current.includes(memberId) ? current : [...current, memberId]
        : current.filter((id) => id !== memberId),
    )
  }

  function handleSave() {
    setHasSubmitted(true)
    if (interests.length === 0) {
      toast.error('Choose at least one interest before saving.')
      return
    }

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not signed in'); return }

      const spotsArray = favouriteSpots
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('members_main')
        .update({
          cc_interests: interests,
          cc_study_programme: studyProgramme || null,
          cc_already_know: alreadyKnow,
          cc_favourite_coffee: favouriteCoffee || null,
          cc_favourite_spots: spotsArray.length ? spotsArray : null,
          cc_fun_fact: funFact || null,
          cc_active: true,
        })
        .ilike('"TBC Email"', user.email ?? '')

      if (error) {
        toast.error('We could not save your matching preferences. Please try again.')
      } else {
        toast.success('Matching preferences saved.')
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Matching preferences</h3>
        <p className="text-sm text-muted-foreground">
          Choose at least one interest to participate. Three to five usually give the pairing more useful signal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What would you enjoy talking about?</CardTitle>
          <CardDescription>
            Start with the topics that would make a Coffee Chat worth your time.
          </CardDescription>
          <CardAction><Badge variant="secondary">{interests.length} selected</Badge></CardAction>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend className="sr-only">Core interests</FieldLegend>
            <FieldGroup data-slot="checkbox-group" className="grid gap-2 sm:grid-cols-2">
              {CORE_INTEREST_OPTIONS.map((interest) => {
                const id = `interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
                return (
                  <FieldLabel key={interest} htmlFor={id}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={id}
                        checked={interests.includes(interest)}
                        onCheckedChange={() => toggleInterest(interest)}
                      />
                      <FieldContent><FieldTitle>{interest}</FieldTitle></FieldContent>
                    </Field>
                  </FieldLabel>
                )
              })}
            </FieldGroup>
            {hasSubmitted && interests.length === 0 && (
              <FieldError>Choose at least one interest.</FieldError>
            )}
          </FieldSet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional match improvements</CardTitle>
          <CardDescription>Add only what you are comfortable sharing with your future match.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple">
            <AccordionItem value="more-interests">
              <AccordionTrigger>More interests</AccordionTrigger>
              <AccordionContent>
                <FieldSet>
                  <FieldLegend className="sr-only">Additional interests</FieldLegend>
                  <FieldGroup data-slot="checkbox-group" className="grid gap-2 sm:grid-cols-2">
                    {MORE_INTEREST_OPTIONS.map((interest) => {
                      const id = `interest-${interest.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
                      return (
                        <FieldLabel key={interest} htmlFor={id}>
                          <Field orientation="horizontal">
                            <Checkbox
                              id={id}
                              checked={interests.includes(interest)}
                              onCheckedChange={() => toggleInterest(interest)}
                            />
                            <FieldContent><FieldTitle>{interest}</FieldTitle></FieldContent>
                          </Field>
                        </FieldLabel>
                      )
                    })}
                  </FieldGroup>
                </FieldSet>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="about-you">
              <AccordionTrigger>About you</AccordionTrigger>
              <AccordionContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="study">Study programme</FieldLabel>
                    <Input id="study" placeholder="e.g. MSc Informatics, TUM" value={studyProgramme} onChange={(event) => setStudyProgramme(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="coffee">Favourite coffee drink</FieldLabel>
                    <Input id="coffee" placeholder="e.g. Flat white or oat latte" value={favouriteCoffee} onChange={(event) => setFavouriteCoffee(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="spots">Favourite coffee spots in Munich</FieldLabel>
                    <Input id="spots" placeholder="Separate places with commas" value={favouriteSpots} onChange={(event) => setFavouriteSpots(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="funfact">Fun fact</FieldLabel>
                    <Textarea id="funfact" placeholder="Give your match an easy conversation starter" value={funFact} onChange={(event) => setFunFact(event.target.value)} rows={3} />
                  </Field>
                </FieldGroup>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="already-know">
              <AccordionTrigger>
                People I already know {alreadyKnow.length > 0 ? `(${alreadyKnow.length})` : ''}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    We avoid these pairings when another complete matching is available.
                  </p>
                  <Field>
                    <FieldLabel htmlFor="known-member-search">Search members</FieldLabel>
                    <Input id="known-member-search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search by name or department" />
                    <FieldDescription>Only active members are shown.</FieldDescription>
                  </Field>

                  {filteredKnownMembers.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto rounded-lg border">
                      <FieldGroup data-slot="checkbox-group" className="gap-0">
                        {filteredKnownMembers.map((member) => {
                          const checkboxId = `known-member-${member.id}`
                          return (
                            <FieldLabel key={member.id} htmlFor={checkboxId} className="border-b last:border-b-0">
                              <Field orientation="horizontal">
                                <Checkbox id={checkboxId} checked={alreadyKnow.includes(member.id)} onCheckedChange={(checked) => toggleKnownMember(member.id, checked === true)} />
                                <FieldContent>
                                  <FieldTitle>{member.name}</FieldTitle>
                                  {member.department && <FieldDescription>{member.department}</FieldDescription>}
                                </FieldContent>
                              </Field>
                            </FieldLabel>
                          )
                        })}
                      </FieldGroup>
                    </div>
                  ) : (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
                        <EmptyTitle>No members found</EmptyTitle>
                        <EmptyDescription>Try a different name or department.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex justify-end bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button onClick={handleSave} disabled={isPending} size="lg">
          {isPending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
          {isPending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  )
}
