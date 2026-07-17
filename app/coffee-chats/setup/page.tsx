'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const INTEREST_OPTIONS = [
  'Blockchain', 'DeFi', 'NFTs', 'Web3', 'Smart Contracts',
  'Solidity', 'Research', 'Finance', 'Trading', 'Investing',
  'Software Dev', 'Design', 'Marketing', 'Legal', 'VC & Startups',
  'AI / ML', 'Sports', 'Music', 'Travel', 'Gaming',
]

export default function CoffeeChatsSetupPage() {
  const supabase = getSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  const [interests, setInterests] = useState<string[]>([])
  const [studyProgramme, setStudyProgramme] = useState('')
  const [favouriteCoffee, setFavouriteCoffee] = useState('')
  const [favouriteSpots, setFavouriteSpots] = useState('')
  const [funFact, setFunFact] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('members_main')
        .select('cc_interests, cc_study_programme, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
        .ilike('"TBC Email"', user.email ?? '')
        .maybeSingle()

      if (data) {
        setInterests((data.cc_interests as string[] | null) ?? [])
        setStudyProgramme((data.cc_study_programme as string | null) ?? '')
        setFavouriteCoffee((data.cc_favourite_coffee as string | null) ?? '')
        setFavouriteSpots(((data.cc_favourite_spots as string[] | null) ?? []).join(', '))
        setFunFact((data.cc_fun_fact as string | null) ?? '')
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
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-4" />
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
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
