type Category =
  | 'blockchain'
  | 'defi'
  | 'dev'
  | 'design'
  | 'finance'
  | 'research'
  | 'sports'
  | 'music'
  | 'travel'
  | 'tbc'
  | 'universal'

const QUESTIONS: Record<Category, string[]> = {
  blockchain: [
    'What first pulled you into blockchain — was there a specific project or moment?',
    'Which consensus mechanism do you find most elegant and why?',
    'If you had to pitch one blockchain use case to a sceptic, what would it be?',
    'What is the most overhyped and most underrated thing in crypto right now?',
    'How do you think regulators will approach on-chain identity in five years?',
  ],
  defi: [
    'What DeFi protocol has impressed you the most architecturally?',
    'How do you personally navigate risk when using DeFi protocols?',
    'Do you think DeFi can realistically replace traditional lending in this decade?',
    'What is your take on the current state of stablecoins?',
    'Which unsolved DeFi problem are you most excited about?',
  ],
  dev: [
    'What is the most interesting technical problem you have worked on recently?',
    'Tabs or spaces — and why are you wrong?',
    'Which programming language do you secretly enjoy even if you would not admit it?',
    'What is the one developer tool you could not live without?',
    'How do you stay up to date with new tech without getting overwhelmed?',
  ],
  design: [
    'What is a product or interface that you think gets design completely right?',
    'Where do you draw the line between good UX and hand-holding the user too much?',
    'What is the biggest design mistake you see in Web3 products?',
    'Describe your go-to process when you are completely stuck on a design problem.',
    'Which designer or design studio inspires you most right now?',
  ],
  finance: [
    'What financial concept took you the longest to truly internalise?',
    'Traditional finance vs DeFi — where do you see the boundary in ten years?',
    'What is the most counterintuitive thing you have learned about markets?',
    'If you could redesign one aspect of global financial infrastructure, what would it be?',
    'What financial metric do you think is most misunderstood or misused?',
  ],
  research: [
    'What research paper changed the way you think about something?',
    'How do you decide when a research idea is worth pursuing vs abandoning?',
    'What is the biggest gap between academic blockchain research and industry practice?',
    'How do you handle situations where your research contradicts a popular assumption?',
    'What research question keeps you up at night?',
  ],
  sports: [
    'If you could pick up any sport from zero tomorrow, what would it be?',
    'What lesson from sport do you apply most in your professional life?',
    'Best sporting event you have ever attended or watched?',
    'Do you think eSports should be considered a "real" sport?',
    'What motivates you to keep training when your schedule gets crazy?',
  ],
  music: [
    'What is the last album you listened to all the way through in one sitting?',
    'Is there a song you associate with a specific memory or period of your life?',
    'Concerts or studio albums — where do you experience music best?',
    'What genre do you listen to that might surprise people who know you?',
    'If your life had a soundtrack, what would the opening track be?',
  ],
  travel: [
    'What place have you visited that completely defied your expectations?',
    'Do you plan every detail or prefer to arrive and figure it out?',
    'Is there a city you could imagine living in that is not where you live now?',
    'What is the best meal you have had while travelling?',
    'What destination is at the very top of your list and what is stopping you?',
  ],
  tbc: [
    'How did you first hear about TBC and what made you join?',
    'What has been your favourite TBC memory or event so far?',
    'If you could add one new initiative or department to TBC, what would it be?',
    'What skill or knowledge from TBC has been most useful outside the club?',
    'Who in TBC has influenced your thinking the most and why?',
  ],
  universal: [
    'What is something you believed strongly five years ago that you no longer believe?',
    'What is the most useful habit you have built in the last year?',
    'If you could have coffee with anyone — alive or dead — who would it be?',
    'What book, podcast, or video would you recommend to almost anyone?',
    'What is something you are currently learning outside your main field?',
  ],
}

const INTEREST_TO_CATEGORY: Array<[string, Category]> = [
  ['blockchain', 'blockchain'],
  ['crypto', 'blockchain'],
  ['web3', 'blockchain'],
  ['smart contract', 'blockchain'],
  ['solidity', 'dev'],
  ['defi', 'defi'],
  ['dev', 'dev'],
  ['software', 'dev'],
  ['programming', 'dev'],
  ['design', 'design'],
  ['marketing', 'design'],
  ['finance', 'finance'],
  ['trading', 'finance'],
  ['investing', 'finance'],
  ['vc', 'finance'],
  ['research', 'research'],
  ['sport', 'sports'],
  ['music', 'music'],
  ['travel', 'travel'],
]

function interestToCategory(interest: string): Category | null {
  const normalized = interest.toLowerCase()
  return INTEREST_TO_CATEGORY.find(([keyword]) => normalized.includes(keyword))?.[1] ?? null
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function getQuestionsForPair(
  person1Interests: string[],
  person2Interests: string[],
): [string, string, string] {
  const categories = new Set(
    [...person1Interests, ...person2Interests]
      .map(interestToCategory)
      .filter((category): category is Category => category !== null),
  )
  const chosen = [...categories].slice(0, 3).map((category) => pickRandom(QUESTIONS[category]))

  if (chosen.length < 3) chosen.push(pickRandom(QUESTIONS.tbc))
  while (chosen.length < 3) chosen.push(pickRandom(QUESTIONS.universal))

  return [chosen[0], chosen[1], chosen[2]]
}
