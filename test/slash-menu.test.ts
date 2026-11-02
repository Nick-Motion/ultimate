import { describe, expect, it } from 'vitest'
import { matchSkills, slashQuery } from '../extensions/info/slash.ts'

describe('composer slash menu', () => {
  it('opens only for a bare slash word at the start of the draft', () => {
    expect(slashQuery('/')).toBe('')
    expect(slashQuery('/rev')).toBe('rev')
    expect(slashQuery('/rev ')).toBeUndefined()
    expect(slashQuery('fix /rev')).toBeUndefined()
    expect(slashQuery('/skill:review do it')).toBeUndefined()
  })

  it('ranks name prefixes before name and description matches', () => {
    const skills = [
      { name: 'write-tests', description: 'covers review of tests' },
      { name: 'code-review', description: 'reviews a range' },
      { name: 'review', description: 'one pass' },
      { name: 'deploy', description: 'ships it' },
    ]
    expect(matchSkills(skills, 'Rev').map((skill) => skill.name)).toEqual([
      'review',
      'code-review',
      'write-tests',
    ])
  })
})
