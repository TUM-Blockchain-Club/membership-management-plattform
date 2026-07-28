'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { filterKnownMembers, type KnownMemberOption } from '@/lib/coffee-chats/profiles'

const INTEREST_OPTIONS = [
  'Blockchain', 'DeFi', 'NFTs', 'Web3', 'Smart Contracts',
  'Solidity', 'Research', 'Finance', 'Trading', 'Investing',
  'Software Dev', 'Design', 'Marketing', 'Legal', 'VC & Startups',
  'AI / ML', 'Sports', 'Music', 'Travel', 'Gaming',
]

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
        toast.error(error.message)
      } else {
        toast.success('Coffee chat profile saved!')
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Coffee Chat Profile</h2>
        <p className="text-white/60 text-sm">
          Help us find you the best match. All fields are optional but more detail means better matches.
        </p>
      </div>

      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle className="text-white">Interests</CardTitle>
          <CardDescription className="text-white/50">
            Select topics you are excited to talk about.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleInterest(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  interests.includes(opt)
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border text-white/60 hover:border-white/40 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle className="text-white">People I Already Know</CardTitle>
          <CardDescription className="text-white/50">
            We will avoid matching you with these members when another valid match is available.
            {alreadyKnow.length > 0 ? ` ${alreadyKnow.length} selected.` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="known-member-search">Search members</FieldLabel>
            <Input
              id="known-member-search"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search by name or department"
            />
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
                <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
                <EmptyTitle>No members found</EmptyTitle>
                <EmptyDescription>Try a different name or department.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-background/50">
        <CardHeader>
          <CardTitle className="text-white">About You</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="study" className="text-white/80">Study programme</Label>
            <Input
              id="study"
              placeholder="e.g. MSc Informatics, TUM"
              value={studyProgramme}
              onChange={(e) => setStudyProgramme(e.target.value)}
              className="bg-background/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coffee" className="text-white/80">Favourite coffee drink</Label>
            <Input
              id="coffee"
              placeholder="e.g. Flat white, Oat latte, Black coffee"
              value={favouriteCoffee}
              onChange={(e) => setFavouriteCoffee(e.target.value)}
              className="bg-background/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spots" className="text-white/80">Favourite coffee spots in Munich</Label>
            <Input
              id="spots"
              placeholder="Separate with commas: e.g. Lost Weekend, Standl 20, Franz & Josef"
              value={favouriteSpots}
              onChange={(e) => setFavouriteSpots(e.target.value)}
              className="bg-background/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="funfact" className="text-white/80">Fun fact about you</Label>
            <Textarea
              id="funfact"
              placeholder="Something your match can use as an ice-breaker..."
              value={funFact}
              onChange={(e) => setFunFact(e.target.value)}
              className="bg-background/80 resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="lg">
          {isPending ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}
