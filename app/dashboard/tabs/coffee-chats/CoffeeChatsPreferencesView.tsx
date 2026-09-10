'use client'

import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import { CheckIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from '@/components/ui/questionnaire'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  demoMember,
  filterKnownMembers,
  getCoffeeChatProfileError,
  isCoffeeChatsDemoClient,
  parseCoffeeChatSpots,
  type KnownMemberOption,
} from '@/lib/coffee-chats'

const INTEREST_OPTIONS = [
  'Blockchain',
  'DeFi',
  'NFTs',
  'Web3',
  'Smart Contracts',
  'Solidity',
  'Research',
  'Finance',
  'Trading',
  'Investing',
  'Software Dev',
  'Design',
  'Marketing',
  'Legal',
  'VC & Startups',
  'AI / ML',
  'Sports',
  'Music',
  'Travel',
  'Gaming',
] as const

type MemberDirectoryRow = {
  id: number
  Name: string | null
  Department: string | null
}

type QuestionnaireStep = 'interests' | 'about' | 'alreadyKnow'

const QUESTIONNAIRE_ITEMS = {
  interests: 'interests',
  about: 'about',
  alreadyKnow: 'alreadyKnow',
} as const

const QUESTIONNAIRE_TITLE_IDS = {
  interests: 'coffee-chat-interests-title',
  about: 'coffee-chat-about-title',
  alreadyKnow: 'coffee-chat-already-know-title',
} as const

export function CoffeeChatsPreferencesView() {
  const supabase = getSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  const [interests, setInterests] = useState<string[]>([])
  const [interestOptions, setInterestOptions] = useState<string[]>([...INTEREST_OPTIONS])
  const [studyProgramme, setStudyProgramme] = useState('')
  const [favouriteCoffee, setFavouriteCoffee] = useState('')
  const [favouriteSpots, setFavouriteSpots] = useState('')
  const [funFact, setFunFact] = useState('')
  const [knownMembers, setKnownMembers] = useState<KnownMemberOption[]>([])
  const [alreadyKnow, setAlreadyKnow] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showInterestError, setShowInterestError] = useState(false)
  const [currentStep, setCurrentStep] = useState<QuestionnaireStep>(QUESTIONNAIRE_ITEMS.interests)

  const filteredKnownMembers = useMemo(
    () => filterKnownMembers(knownMembers, memberSearch),
    [knownMembers, memberSearch],
  )
  const filteredKnownMemberIds = useMemo(
    () => new Set(filteredKnownMembers.map((member) => member.id)),
    [filteredKnownMembers],
  )

  const questionnaireItems = useMemo(
    () => [
      {
        choices: interestOptions.map((value) => ({ value })),
        name: QUESTIONNAIRE_ITEMS.interests,
        required: true,
      },
      {
        name: QUESTIONNAIRE_ITEMS.about,
      },
      {
        choices: knownMembers.map(({ id }) => ({ value: String(id) })),
        name: QUESTIONNAIRE_ITEMS.alreadyKnow,
      },
    ],
    [interestOptions, knownMembers],
  )

  const aboutHasValue = Boolean(
    studyProgramme.trim() || favouriteCoffee.trim() || favouriteSpots.trim() || funFact.trim(),
  )

  useEffect(() => {
    async function loadProfile() {
      if (isCoffeeChatsDemoClient()) {
        setInterests(demoMember.cc_interests)
        setInterestOptions((current) => Array.from(new Set([...current, ...demoMember.cc_interests])))
        setStudyProgramme(demoMember.cc_study_programme)
        setFavouriteCoffee(demoMember.cc_favourite_coffee)
        setFavouriteSpots(demoMember.cc_favourite_spots.join(', '))
        setFunFact(demoMember.cc_fun_fact)
        setKnownMembers([
          { id: 2, name: 'Alex Morgan', department: 'IT & Development' },
          { id: 3, name: 'Mina Bauer', department: 'Research' },
          { id: 4, name: 'Jonas Keller', department: 'Industry' },
        ])
        setAlreadyKnow([3])
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [{ data }, { data: members }] = await Promise.all([
        supabase
          .from('members_main')
          .select(
            'id, cc_interests, cc_study_programme, cc_already_know, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact',
          )
          .ilike('"TBC Email"', user.email ?? '')
          .maybeSingle(),
        supabase.from('members_main').select('id, Name, Department').order('Name', { ascending: true }),
      ])

      if (data) {
        const currentMemberId = data.id as number
        const directory = ((members ?? []) as MemberDirectoryRow[]).filter(
          (member) => member.id !== currentMemberId,
        )
        const selectableMemberIds = new Set(directory.map((member) => member.id))
        const savedInterests = (data.cc_interests as string[] | null) ?? []
        setInterests(savedInterests)
        setInterestOptions((current) => Array.from(new Set([...current, ...savedInterests])))
        setStudyProgramme((data.cc_study_programme as string | null) ?? '')
        setFavouriteCoffee((data.cc_favourite_coffee as string | null) ?? '')
        setAlreadyKnow(
          ((data.cc_already_know as number[] | null) ?? []).filter((id) => selectableMemberIds.has(id)),
        )
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

  function toggleKnownMember(memberId: number, checked: boolean) {
    setAlreadyKnow((current) =>
      checked
        ? current.includes(memberId)
          ? current
          : [...current, memberId]
        : current.filter((id) => id !== memberId),
    )
  }

  function handleInterestChange(event: ChangeEvent<HTMLInputElement>) {
    const { checked, value } = event.target
    setInterests((current) => {
      if (checked) return current.includes(value) ? current : [...current, value]
      return current.filter((interest) => interest !== value)
    })
    if (checked) setShowInterestError(false)
  }

  function savePreferences() {
    const profileError = getCoffeeChatProfileError(interests)
    if (profileError) {
      setShowInterestError(true)
      setCurrentStep(QUESTIONNAIRE_ITEMS.interests)
      toast.error(profileError)
      return
    }
    setShowInterestError(false)

    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        toast.success('Matching preferences saved.')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not signed in')
        return
      }

      const { error } = await supabase
        .from('members_main')
        .update({
          cc_interests: interests,
          cc_study_programme: studyProgramme.trim() || null,
          cc_already_know: alreadyKnow,
          cc_favourite_coffee: favouriteCoffee.trim() || null,
          cc_favourite_spots: parseCoffeeChatSpots(favouriteSpots),
          cc_fun_fact: funFact.trim() || null,
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

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    savePreferences()
  }

  if (loading) {
    return (
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Matching preferences</h3>
        <p className="text-sm text-muted-foreground">
          Share what you would like to talk about and who you would like to meet.
        </p>
      </div>

      <Questionnaire
        className="w-full"
        item={currentStep}
        items={questionnaireItems}
        onItemChange={(item) => {
          if (item in QUESTIONNAIRE_ITEMS) setCurrentStep(item as QuestionnaireStep)
        }}
        onSubmit={handleSave}
      >
        <QuestionnaireProgress />

        <QuestionnaireItem
          aria-labelledby={QUESTIONNAIRE_TITLE_IDS.interests}
          invalid={showInterestError}
          multiple
          name={QUESTIONNAIRE_ITEMS.interests}
          required
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <QuestionnaireTitle id={QUESTIONNAIRE_TITLE_IDS.interests} render={<h4 />}>
                  What would you like to talk about?
                </QuestionnaireTitle>
              </CardTitle>
              <CardDescription>
                <QuestionnaireDescription>
                  Select at least one topic. Three to five give the best matching signal.
                </QuestionnaireDescription>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionnaireChoices className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {interestOptions.map((interest) => (
                  <QuestionnaireChoice
                    key={interest}
                    value={interest}
                    checked={interests.includes(interest)}
                    onChange={handleInterestChange}
                  >
                    {interest}
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
              <QuestionnaireError>
                {showInterestError ? 'Select at least one interest before saving.' : undefined}
              </QuestionnaireError>
              <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                {interests.length} selected
              </p>
            </CardContent>
          </Card>
        </QuestionnaireItem>

        <QuestionnaireItem
          aria-labelledby={QUESTIONNAIRE_TITLE_IDS.about}
          name={QUESTIONNAIRE_ITEMS.about}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPinIcon aria-hidden="true" />
                <CardTitle>
                  <QuestionnaireTitle id={QUESTIONNAIRE_TITLE_IDS.about} render={<h4 />}>
                    Tell your match a little about you
                  </QuestionnaireTitle>
                </CardTitle>
              </div>
              <CardDescription>
                <QuestionnaireDescription>
                  Optional details give your match useful conversation starters.
                </QuestionnaireDescription>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="study-programme">Study programme</FieldLabel>
                  <Input
                    id="study-programme"
                    name="studyProgramme"
                    placeholder="e.g. MSc Informatics, TUM"
                    value={studyProgramme}
                    onChange={(event) => setStudyProgramme(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="favourite-coffee">Favourite coffee drink</FieldLabel>
                  <Input
                    id="favourite-coffee"
                    name="favouriteCoffee"
                    placeholder="e.g. Flat white, oat latte, black coffee"
                    value={favouriteCoffee}
                    onChange={(event) => setFavouriteCoffee(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="meeting-spots">Recommended coffee spots</FieldLabel>
                  <Input
                    id="meeting-spots"
                    name="favouriteSpots"
                    placeholder="e.g. Lost Weekend, Café Frischhut, Vorhölzer Forum"
                    value={favouriteSpots}
                    onChange={(event) => setFavouriteSpots(event.target.value)}
                  />
                  <FieldDescription>Separate multiple locations with commas.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="fun-fact">Fun fact</FieldLabel>
                  <Textarea
                    id="fun-fact"
                    name="funFact"
                    placeholder="Something your match can use as an icebreaker…"
                    value={funFact}
                    onChange={(event) => setFunFact(event.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </QuestionnaireItem>

        <QuestionnaireItem
          aria-labelledby={QUESTIONNAIRE_TITLE_IDS.alreadyKnow}
          name={QUESTIONNAIRE_ITEMS.alreadyKnow}
          multiple
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UsersIcon aria-hidden="true" />
                <CardTitle>
                  <QuestionnaireTitle id={QUESTIONNAIRE_TITLE_IDS.alreadyKnow} render={<h4 />}>
                    Who would you prefer not to meet?
                  </QuestionnaireTitle>
                </CardTitle>
              </div>
              <CardDescription>
                <QuestionnaireDescription>
                  Select teammates or friends you already see frequently. This is optional.
                </QuestionnaireDescription>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="known-member-search">Search members</FieldLabel>
                  <Input
                    id="known-member-search"
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search by name or department…"
                  />
                  <FieldDescription>
                    {alreadyKnow.length > 0
                      ? `${alreadyKnow.length} selected for exclusion.`
                      : 'Select members to exclude from your pairings.'}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              {knownMembers.length > 0 && (
                <QuestionnaireChoices className="max-h-80 overflow-y-auto">
                  {knownMembers.map((member) => (
                    <QuestionnaireChoice
                      key={member.id}
                      hidden={!filteredKnownMemberIds.has(member.id)}
                      value={String(member.id)}
                      checked={alreadyKnow.includes(member.id)}
                      onChange={(event) => toggleKnownMember(member.id, event.target.checked)}
                    >
                      <span className="font-medium">{member.name}</span>
                      {member.department && (
                        <span className="text-muted-foreground">{member.department}</span>
                      )}
                    </QuestionnaireChoice>
                  ))}
                </QuestionnaireChoices>
              )}
              {filteredKnownMembers.length === 0 && (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No members found</EmptyTitle>
                    <EmptyDescription>Try a different name or department search term.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </QuestionnaireItem>

        <div className="sticky bottom-0 bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <QuestionnaireActions>
            <QuestionnairePrevious>Back</QuestionnairePrevious>
            {currentStep !== QUESTIONNAIRE_ITEMS.alreadyKnow && (
              <QuestionnaireSkip>
                {currentStep === QUESTIONNAIRE_ITEMS.about && aboutHasValue ? 'Continue' : 'Skip'}
              </QuestionnaireSkip>
            )}
            {currentStep !== QUESTIONNAIRE_ITEMS.alreadyKnow && currentStep !== QUESTIONNAIRE_ITEMS.about && (
                <QuestionnaireNext
                  onClick={(event) => {
                    if (currentStep === QUESTIONNAIRE_ITEMS.interests && interests.length === 0) {
                      event.preventDefault()
                      setShowInterestError(true)
                    }
                  }}
                >
                  Continue
                </QuestionnaireNext>
              )}
            {currentStep === QUESTIONNAIRE_ITEMS.alreadyKnow && alreadyKnow.length === 0 ? (
              <QuestionnaireSkip className="col-start-3" disabled={isPending} variant="default">
                {isPending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                {isPending ? 'Saving…' : 'Save preferences'}
              </QuestionnaireSkip>
            ) : (
              <QuestionnaireSubmit disabled={isPending}>
                {isPending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                {isPending ? 'Saving…' : 'Save preferences'}
              </QuestionnaireSubmit>
            )}
          </QuestionnaireActions>
        </div>
      </Questionnaire>
    </div>
  )
}
