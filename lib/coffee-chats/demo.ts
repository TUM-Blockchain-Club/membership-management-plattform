export const coffeeChatsDemoEnabled =
  process.env.NEXT_PUBLIC_COFFEE_CHATS_DEMO === 'true'

export const isCoffeeChatsDemoClient = () =>
  coffeeChatsDemoEnabled ||
  (typeof document !== 'undefined' &&
    document.querySelector('[data-coffee-chats-demo="true"]') !== null)

export const demoRound = {
  id: 'demo-round-august-2026',
  month: '2026-08',
  status: 'open',
  signup_deadline: '2026-08-21T21:59:00.000Z',
  meet_deadline: '2026-08-31T21:59:00.000Z',
  created_at: '2026-08-01T09:00:00.000Z',
}

export const demoMember = {
  id: 1,
  Name: 'Yesi Demo',
  Department: 'Web3 Talents',
  cc_active: true,
  cc_interests: ['Blockchain', 'DeFi', 'Travel', 'Music'],
  cc_study_programme: 'MSc Management & Technology, TUM',
  cc_favourite_coffee: 'Oat flat white',
  cc_favourite_spots: ['Lost Weekend', 'Standl 20'],
  cc_fun_fact: 'I once planned a club event while travelling across three countries.',
}

export const demoDashboardMember = {
  id: 1,
  created_at: '2026-08-01T09:00:00.000Z',
  Name: demoMember.Name,
  Role: 'Board Member',
  Status: 'Active',
  Department: demoMember.Department,
  'Project/Task': 'Coffee Chats',
  'Area of Expertise': 'Community building',
  Picture: null,
  Uni: 'TUM',
  'Semester Joined': 'WS 2025',
  Degree: demoMember.cc_study_programme,
  Phone: null,
  'Private Email': 'yesi.demo@example.com',
  'TBC Email': 'yesi.demo@tum-blockchain.com',
  Linkedin: null,
  Telegram: null,
  Discord: null,
  Instagram: null,
  Twitter: null,
  'Size Merch': null,
}

export const demoMatch = {
  pair: {
    id: 'demo-pair-1',
    status: 'pending',
    icebreakers: [
      'What first made you curious about blockchain?',
      'Which project would you build if time and money were unlimited?',
      'What is one place in Munich everyone should visit?',
    ],
    selfieUrl: null,
    dateMet: null,
    rating: null,
    highlightNote: null,
  },
  partners: [
    {
      id: 2,
      name: 'Alex Morgan',
      department: 'IT & Development',
      interests: ['Blockchain', 'Software Dev', 'Travel'],
      favouriteCoffee: 'Cappuccino',
      favouriteSpots: ['Lost Weekend', 'Standl 20'],
      funFact: 'Built a first smart contract during a train ride to Berlin.',
    },
  ],
  round: {
    month: demoRound.month,
    id: demoRound.id,
    status: 'paired',
    signupDeadline: demoRound.signup_deadline,
    meetDeadline: demoRound.meet_deadline,
  },
}

export const demoGallery = [
  {
    id: 'demo-gallery-1',
    selfie_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-07-18',
    highlight_note: 'Great conversation about building communities in Web3.',
    round: { month: 'July 2026' },
  },
  {
    id: 'demo-gallery-2',
    selfie_url: 'https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-06-22',
    highlight_note: 'From DeFi research to favourite Munich coffee spots.',
    round: { month: 'June 2026' },
  },
  {
    id: 'demo-gallery-3',
    selfie_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-05-15',
    highlight_note: 'New project ideas and a plan to meet again.',
    round: { month: 'May 2026' },
  },
]

export const demoRounds = [
  demoRound,
  {
    ...demoRound,
    id: 'demo-round-july-2026',
    month: '2026-07',
    status: 'paired',
    signup_deadline: '2026-07-10T21:59:00.000Z',
    meet_deadline: '2026-07-31T21:59:00.000Z',
    created_at: '2026-07-01T09:00:00.000Z',
  },
]
