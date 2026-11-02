/** The composer's `/` skill menu, pure for tests. Browser-safe. */

/** What follows a `/` that is the whole draft so far (`/rev` → `rev`); undefined once the text is anything else. */
export function slashQuery(text: string): string | undefined {
  return /^\/(\S*)$/.exec(text)?.[1]
}

/** Skills matching `query` by name or description: name prefixes first, then names, then descriptions. */
export function matchSkills<Skill extends { name: string; description: string }>(
  skills: readonly Skill[],
  query: string,
): Skill[] {
  const needle = query.toLowerCase()
  const rank = (skill: Skill) => {
    const name = skill.name.toLowerCase()
    if (name.startsWith(needle)) return 0
    if (name.includes(needle)) return 1
    return skill.description.toLowerCase().includes(needle) ? 2 : undefined
  }
  return skills
    .flatMap((skill) => {
      const order = rank(skill)
      return order === undefined ? [] : [{ skill, order }]
    })
    .toSorted((a, b) => a.order - b.order)
    .map(({ skill }) => skill)
}
