'use client'

import { useState } from 'react'
import { ArrowDownIcon, ArrowUpRightIcon, LeafIcon, MessageCircleIcon, SendIcon, SproutIcon, Trash2Icon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TreeData, TreePerson } from '@/lib/treeOfLife'
import styles from './tree-of-life.module.css'

type Memory = { id: number; person: TreePerson; body: string; demo: boolean; subject: string | null }
type Selected = TreeData['branches'][number]['people'][number] & { year: number }

function Portrait({ person, large = false }: { person: TreePerson; large?: boolean }) {
  return <Avatar className={large ? styles.portraitLarge : styles.portrait}>
    {person.picture && <AvatarImage src={person.picture} alt="" loading="lazy" />}
    <AvatarFallback>{person.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</AvatarFallback>
  </Avatar>
}

export function TreeOfLifePage({ initialData }: { initialData: TreeData }) {
  const { branches, viewer } = initialData
  const [selected, setSelected] = useState<Selected | null>(null)
  const [draft, setDraft] = useState('')
  const [subject, setSubject] = useState<string | null>(null)
  const [memories, setMemories] = useState<Memory[]>(() => branches[0].people.slice(0, 2).map((person, index) => ({
    id: index, person, demo: true, subject: null,
    body: index === 0 ? 'My favourite part was never the final presentation. It was the people who stayed afterwards to help make the next idea happen.' : 'Every batch leaves something behind. A tradition, an open door, or the courage to try something a little bigger.',
  })))
  const [notice, setNotice] = useState('')
  const total = branches.reduce((count, branch) => count + branch.people.length, 0)

  function postMemory(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim() || draft.length > 1000) return
    setMemories(current => [{ id: Date.now(), person: viewer, body: draft.trim(), demo: false, subject }, ...current])
    setDraft(''); setSubject(null); setNotice('Added to this preview. Your memory is not saved to the database.')
  }

  function rememberPerson() {
    if (!selected) return
    setSubject(`${selected.name} · ${selected.year}`)
    setSelected(null)
    // Wait for the Radix dialog to restore focus before moving to the composer.
    setTimeout(() => document.getElementById('tree-memory')?.focus(), 0)
  }

  return <div className={styles.page}>
    <div className={styles.experiment}><span className={styles.experimentDot} /> Experimental garden <span>·</span> Simulated years, roles & stories. Real member portraits.</div>
    <header className={styles.hero}>
      <div className={styles.rings} aria-hidden="true"><i /><i /><i /></div>
      <span className={styles.eyebrow}><SproutIcon size={15} /> The people behind the progress</span>
      <h1>The Tree <em>of Life.</em></h1>
      <p>Different people. Shared roots.<br />A living tribute to the boards that helped TBC grow.</p>
      <div className={styles.heroFooter}><span><strong>05</strong> generations</span><span><strong>{total}</strong> places in our story</span><a href="#tree-generations">Follow the roots <ArrowDownIcon size={15} /></a></div>
    </header>

    <section id="tree-generations" className={styles.tree} aria-label="Simulated board generations">
      <div className={styles.treeHeading}><span>THE GENERATIONS</span><span>Pick a person. Discover a story.</span></div>
      {branches.map((branch, batch) => <section key={branch.year} className={styles.generation} style={{ '--batch': batch } as React.CSSProperties} aria-labelledby={`year-${branch.year}`}>
        <div className={styles.yearLabel}><span className={styles.batchNumber}>CHAPTER 0{branches.length - batch}</span><h2 id={`year-${branch.year}`}>{branch.year}</h2><p>{branch.title}</p><span className={styles.simulated}>Simulated board · {branch.people.length} people</span></div>
        <div className={styles.canopy}>
          <svg className={styles.branches} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            {branch.people.map((person, index) => {
              const x = (index + 0.5) * 1000 / branch.people.length
              return <path key={person.id} d={`M 500 0 C 500 48, ${x} 32, ${x} 100`} />
            })}
          </svg>
          <div className={styles.people} style={{ '--people': branch.people.length || 1 } as React.CSSProperties}>
            {branch.people.map(person => <button type="button" key={person.id} className={styles.person} onClick={() => setSelected({ ...person, year: branch.year })} aria-label={`Read the example story for ${person.name}, ${branch.year}`}>
              <span className={styles.avatarRing}><Portrait person={person} /><span className={styles.openStory}><ArrowUpRightIcon size={12} /></span></span>
              <span className={styles.personName}>{person.name}</span><span className={styles.department}>{person.department}</span>
            </button>)}
          </div>
          {!branch.people.length && <p className={styles.empty}>No member portraits available yet.</p>}
        </div>
      </section>)}
      <div className={styles.roots}><LeafIcon size={22} /><span>Every new branch begins with someone who planted a seed.</span></div>
    </section>

    <section className={styles.wall} aria-labelledby="memories-title">
      <div className={styles.wallIntro}><span className={styles.eyebrow}>The things we remember</span><h2 id="memories-title">More than<br /><em>a name on a tree.</em></h2><p>A small thank you. An unforgettable moment. A story the next generation should hear.</p><span className={styles.localNotice}>Interactive demo · New memories stay on this page until you leave or reload.</span></div>
      <div className={styles.wallContent}>
        <form onSubmit={postMemory} className={styles.composer}>
          <div className={styles.composerIdentity}><Portrait person={viewer} /><div><strong>{viewer.name}</strong><span>Your voice belongs here</span></div></div>
          <label className="sr-only" htmlFor="tree-memory">Share a memory</label>
          {subject && <div className={styles.subject}>About {subject}<Button type="button" variant="ghost" size="xs" onClick={() => setSubject(null)}>Clear</Button></div>}
          <Textarea id="tree-memory" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} placeholder="Who made a difference to your time at TBC?" className={styles.textarea} />
          <div className={styles.composerFooter}><span>{draft.length}/1,000 · Preview only</span><Button type="submit" size="sm" disabled={!draft.trim()}><SendIcon data-icon="inline-start" /> Leave a memory</Button></div>
        </form>
        <p className={styles.notice} role="status">{notice}</p>
        <div className={styles.memories}>
          {memories.map(memory => <article className={styles.memory} key={memory.id}>
            <Portrait person={memory.person} /><div className={styles.memoryText}><div className={styles.memoryMeta}><strong>{memory.person.name}</strong><span>{memory.demo ? 'Example memory · fictional' : 'Just now · local preview'}</span></div>{memory.subject && <span className={styles.memorySubject}>For {memory.subject}</span>}<p>{memory.body}</p></div>
            {!memory.demo && <Button variant="ghost" size="icon-sm" aria-label="Delete your preview memory" onClick={() => setMemories(current => current.filter(item => item.id !== memory.id))}><Trash2Icon /></Button>}
          </article>)}
        </div>
      </div>
    </section>

    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
      <DialogContent className={styles.storyDialog}>
        {selected && <><DialogHeader><div className={styles.storyTop}><Portrait person={selected} large /><Badge variant="outline">Simulated chapter · {selected.year}</Badge></div><DialogTitle className={styles.storyTitle}>{selected.name}</DialogTitle><DialogDescription>{selected.department} · Example board assignment</DialogDescription></DialogHeader><div className={styles.contribution}><span className={styles.eyebrow}>An example of a lasting contribution</span><p>“{selected.contribution}”</p></div><p className={styles.storyDisclaimer}>This contribution and year are design placeholders, not a factual claim about this member.</p><Button onClick={rememberPerson}><MessageCircleIcon data-icon="inline-start" /> Share a memory</Button></>}
      </DialogContent>
    </Dialog>
  </div>
}
