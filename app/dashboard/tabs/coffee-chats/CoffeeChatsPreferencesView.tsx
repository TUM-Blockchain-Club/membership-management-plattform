'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { CheckIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  demoMember,
  filterKnownMembers,
  isCoffeeChatsDemoClient,
  type KnownMemberOption,
} from '@/lib/coffee-chats'

type MemberDirectoryRow = {
  id: number
  Name: string | null
  Department: string | null
}

export function CoffeeChatsPreferencesView() {
  const supabase = getSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  const [favouriteSpots, setFavouriteSpots] = useState('')
  const [knownMembers, setKnownMembers] = useState<KnownMemberOption[]>([])
  const [alreadyKnow, setAlreadyKnow] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')

  const filteredKnownMembers = useMemo(
    () => filterKnownMembers(knownMembers, memberSearch),
    [knownMembers, memberSearch],
  )

  useEffect(() => {
    async function loadProfile() {
      if (isCoffeeChatsDemoClient()) {
        setFavouriteSpots(demoMember.cc_favourite_spots.join(', '))
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
          .select('id, cc_already_know, cc_favourite_spots')
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
        setAlreadyKnow(
          ((data.cc_already_know as number[] | null) ?? []).filter((id) => selectableMemberIds.has(id)),
        )
        setFavouriteSpots(((data.cc_favourite_spots as string[] | null) ?? []).join(', '))
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

  function handleSave() {
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

      const spotsArray = favouriteSpots
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('members_main')
        .update({
          cc_already_know: alreadyKnow,
          cc_favourite_spots: spotsArray.length ? spotsArray : null,
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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
          Recommend your favourite meeting spots and select any members you prefer to avoid being paired with.
        </p>
      </div>

      {/* Meeting place recommendation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-5 text-primary" />
            <CardTitle>Meeting place recommendation</CardTitle>
          </div>
          <CardDescription>
            Recommend your favorite cafés or meeting spots in Munich to help your match choose where to meet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="meeting-spots">Recommended coffee spots</FieldLabel>
              <Input
                id="meeting-spots"
                placeholder="e.g. Lost Weekend, Café Frischhut, Vorhölzer Forum"
                value={favouriteSpots}
                onChange={(event) => setFavouriteSpots(event.target.value)}
              />
              <FieldDescription>Separate multiple locations with commas.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* People to avoid */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="size-5 text-primary" />
            <CardTitle>
              People to avoid {alreadyKnow.length > 0 ? `(${alreadyKnow.length} selected)` : ''}
            </CardTitle>
          </div>
          <CardDescription>
            Select members you would prefer not to be paired with (for example, teammates or friends you already see
            frequently).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="known-member-search">Search members</FieldLabel>
              <Input
                id="known-member-search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by name or department…"
              />
              <FieldDescription>Select members to exclude from your pairings.</FieldDescription>
            </Field>

            {filteredKnownMembers.length > 0 ? (
              <div className="max-h-80 overflow-y-auto rounded-lg border">
                <FieldGroup data-slot="checkbox-group" className="gap-0">
                  {filteredKnownMembers.map((member) => {
                    const checkboxId = `known-member-${member.id}`
                    return (
                      <FieldLabel
                        key={member.id}
                        htmlFor={checkboxId}
                        className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <Field orientation="horizontal">
                          <Checkbox
                            id={checkboxId}
                            checked={alreadyKnow.includes(member.id)}
                            onCheckedChange={(checked) => toggleKnownMember(member.id, checked === true)}
                          />
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
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>No members found</EmptyTitle>
                  <EmptyDescription>Try a different name or department search term.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
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
