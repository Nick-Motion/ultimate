import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { runLanderCheck } from '../../extensions/workspaces/lander.ts'
import { context } from '../../server/harness.ts'
import { removeTemp, temp } from '../helpers.ts'
import { running } from './process-helpers.ts'

// A test's detached server left writing to the check's TMPDIR made the temp removal throw ENOTEMPTY.
it('stops a detached child still writing to its temp folder, then removes the folder', async () => {
  const directory = await temp('ultimate-lander-detached-')
  try {
    const childFile = join(directory, 'child')
    const tmp = join(directory, 'tmp')
    const command = `setsid sh -c 'mkdir -p "$TMPDIR/state"; while true; do touch "$TMPDIR/state/$(date +%s%N)"; sleep 0.01; done' & echo $! > '${childFile}'; sleep 0.2`
    const result = await runLanderCheck(directory, command, context, join(directory, 'pids'), tmp)
    expect(result.failure).toBeUndefined()
    expect(await readdir(tmp)).toEqual([])
    expect(running(Number(await readFile(childFile, 'utf8')))).toBe(false)
  } finally {
    await removeTemp(directory)
  }
})

it('kills a silent process group on stall and a printing process on the total cap', async () => {
  const directory = await temp('ultimate-lander-watchdog-')
  try {
    for (const printing of [false, true]) {
      const pidFile = join(directory, 'pid')
      const childFile = join(directory, 'child')
      const command = `echo $$ > '${pidFile}'; sleep 10 & echo $! > '${childFile}'; ${printing ? 'while true; do echo progress; sleep 0.02; done' : 'wait'}`
      const pids = join(directory, 'pids')
      const tmp = join(directory, 'tmp')
      const result = await runLanderCheck(directory, command, context, pids, tmp, {
        stall: 0.2,
        total: 0.5,
      })
      expect(await readdir(pids)).toEqual([])
      expect(await readdir(tmp)).toEqual([])
      expect(result.failure).toContain(printing ? 'Timed out after' : 'Stalled: no output for')
      expect(result.failure?.includes('progress')).toBe(printing)
      const pid = Number(await readFile(pidFile, 'utf8'))
      expect(() => process.kill(pid, 0)).toThrow('ESRCH')
      const child = Number(await readFile(childFile, 'utf8'))
      // A killed orphan may remain a zombie until init reaps it; it must not still be running.
      const stat = await readFile(`/proc/${child}/stat`, 'utf8').catch(() => '')
      expect(stat === '' || stat.split(' ')[2] === 'Z').toBe(true)
    }
  } finally {
    await removeTemp(directory)
  }
})
