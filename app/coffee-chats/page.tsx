import Link from 'next/link'
import { ArrowRightIcon, CoffeeIcon, UsersIcon, ImageIcon, UserIcon } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function CoffeeChatsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = getSupabaseAdminClient()
  const dataClient = admin ?? supabase

  // Resolve member
  const { data: member } = await supabase
    .from('members_main')
    .select('id, Name, cc_active, cc_interests')
    .ilike('"TBC Email"', user?.email ?? '')
    .maybeSingle()

  const memberId = member?.id as number | undefined

  // Active round
  const { data: openRound } = await dataClient
    .from('cc_rounds')
    .select('id, month, status, signup_deadline, meet_deadline')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check if already signed up for open round
  let isSignedUp = false
  if (openRound && memberId) {
    const { data: signup } = await supabase
      .from('cc_signups')
      .select('id')
      .eq('round_id', openRound.id)
      .eq('member_id', memberId)
      .maybeSingle()
    isSignedUp = Boolean(signup)
  }

  // Current match
  const { data: latestPairedRound } = await dataClient
    .from('cc_rounds')
    .select('id, month')
    .in('status', ['paired', 'closed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let hasMatch = false
  if (latestPairedRound && memberId) {
    const { data: pair } = await dataClient
      .from('cc_pairs')
      .select('id')
      .eq('round_id', latestPairedRound.id)
      .or(`person1_id.eq.${memberId},person2_id.eq.${memberId},person3_id.eq.${memberId}`)
      .maybeSingle()
    hasMatch = Boolean(pair)
  }

  const profileIsSetup = Boolean(
    member &&
    (member.cc_interests as string[] | null)?.length
  )

  const sections = [
    {
      href: '/coffee-chats/setup',
      icon: UserIcon,
      title: 'My Coffee Chat Profile',
      description: 'Set your interests, favourite coffee spots, and fun facts so we can find you the best match.',
      cta: profileIsSetup ? 'Edit Profile' : 'Set Up Profile',
      badge: profileIsSetup ? 'Done' : 'Required',
      badgeVariant: profileIsSetup ? 'default' : 'destructive',
    },
    {
      href: '/coffee-chats/join',
      icon: CoffeeIcon,
      title: 'Join This Round',
      description: openRound
        ? `Sign up for the ${openRound.month as string} round.`
        : 'No open round right now — check back soon.',
      cta: isSignedUp ? 'View Signup' : 'Sign Up',
      badge: isSignedUp ? 'Signed Up' : openRound ? 'Open' : 'Closed',
      badgeVariant: (isSignedUp ? 'default' : openRound ? 'secondary' : 'outline') as 'default' | 'secondary' | 'outline' | 'destructive',
    },
    {
      href: '/coffee-chats/my-match',
      icon: UsersIcon,
      title: 'My Match',
      description: hasMatch
        ? `You have been matched for ${latestPairedRound?.month as string ?? 'the latest round'}!`
        : 'Your match for the current round will appear here once pairings are done.',
      cta: 'View Match',
      badge: hasMatch ? 'Matched' : 'Pending',
      badgeVariant: (hasMatch ? 'default' : 'outline') as 'default' | 'secondary' | 'outline' | 'destructive',
    },
    {
      href: '/coffee-chats/gallery',
      icon: ImageIcon,
      title: 'Selfie Gallery',
      description: 'See photos from past coffee chat meetings.',
      cta: 'Open Gallery',
      badge: null,
      badgeVariant: 'outline' as const,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome{member?.Name ? `, ${(member.Name as string).split(' ')[0]}` : ''}
        </h2>
        <p className="text-white/60">
          TBC Coffee Chats pairs you with a fellow member every month for a quick catch-up.
          Fill in your profile, sign up for the current round, and meet your match.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map(({ href, icon: Icon, title, description, cta, badge, badgeVariant }) => (
          <Card key={href} className="border-border bg-background/50 hover:bg-white/5 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-white/60 shrink-0" />
                  <CardTitle className="text-base text-white">{title}</CardTitle>
                </div>
                {badge && (
                  <Badge variant={badgeVariant} className="shrink-0 text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-white/50 text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={href}>
                  {cta}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
