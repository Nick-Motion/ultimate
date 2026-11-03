import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { cn, fillComposer, useConversation, useSystem } from '@/sdk'
import { matchSkills, slashQuery } from './slash.ts'

/**
 * `/` at the start of the composer lists skills above it; ↑/↓ pick, Enter or Tab writes `/skill:name ` into the draft,
 * Esc closes. While it is open the textarea is `aria-expanded`, so Tab (side chat) and Escape (stop) leave it the keys.
 */
export function SlashMenu({ core, dock }: { core: ReactNode; dock?: boolean }) {
  const id = useConversation((conversation) => conversation.id)
  const skills = useSystem()?.skills ?? []
  const [menu, setMenu] = useState<{ id?: number; query: string; selected: number }>()
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const query = menu && menu.id === id ? menu.query : undefined
  const matches = query === undefined ? [] : matchSkills(skills, query)
  const open = matches.length > 0
  const selected = Math.min(menu?.selected ?? 0, matches.length - 1)

  useEffect(() => {
    const editor = root.current?.querySelector('textarea')
    if (open) editor?.setAttribute('aria-expanded', 'true')
    else editor?.removeAttribute('aria-expanded')
  }, [open])
  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected, query])

  function choose(name: string) {
    setMenu(undefined)
    if (id === undefined) return
    const text = `/skill:${name} `
    fillComposer(id, text)
    const editor = root.current?.querySelector('textarea')
    // The cursor goes to the end once React has rendered the new value.
    requestAnimationFrame(() => editor?.setSelectionRange(text.length, text.length))
  }
  function onChange(event: FormEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLTextAreaElement)) return
    const next = slashQuery(event.target.value)
    setMenu(next === undefined ? undefined : { id, query: next, selected: 0 })
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open || !menu || event.nativeEvent.isComposing) return
    if (!(event.target instanceof HTMLTextAreaElement)) return
    const plain = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey
    const move = { ArrowDown: 1, ArrowUp: -1 }[event.key]
    if (move !== undefined)
      setMenu({ ...menu, selected: (selected + move + matches.length) % matches.length })
    else if (plain && (event.key === 'Enter' || event.key === 'Tab')) choose(matches[selected].name)
    else if (event.key === 'Escape') setMenu(undefined)
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="relative" onChangeCapture={onChange} onKeyDownCapture={onKeyDown} ref={root}>
      {open && (
        <div className="absolute inset-x-0 bottom-full z-20">
          <div className={dock ? 'w-full px-4' : 'mx-auto w-full max-w-[46rem] px-3 sm:px-6'}>
            <div
              aria-label="Skills"
              className="mb-1.5 max-h-[min(20rem,45vh)] overflow-y-auto rounded-lg border bg-popover p-1 font-mono text-popover-foreground shadow-md"
              data-ui="slash-menu"
              ref={list}
              role="listbox"
            >
              {matches.map((skill, index) => (
                <div
                  aria-selected={index === selected}
                  className={cn(
                    'flex cursor-default flex-col gap-0.5 rounded-sm px-2 py-1.5',
                    index === selected && 'bg-accent text-accent-foreground',
                  )}
                  key={skill.path}
                  // Keeps focus in the composer, so typing goes on after the pick.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(skill.name)}
                  onMouseMove={() => index !== selected && setMenu({ ...menu!, selected: index })}
                  role="option"
                >
                  <span className="flex w-full items-center gap-2 text-[12.5px]">
                    <span className="text-brand">{skill.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground/60">
                      {skill.scope}
                      {skill.manual && ' · manual'}
                    </span>
                  </span>
                  <span className="line-clamp-1 font-sans text-[11.5px] leading-snug text-muted-foreground">
                    {skill.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {core}
    </div>
  )
}
