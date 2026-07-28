import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// TASK 12.8 — the ONLINE-lane server had no tests at all. These cover exactly the functions where a
// mistake stays invisible until it is expensive: the bounded pre-open queue (12.4), the wrong-door
// upgrade close (12.1), and the write-only key store (config never leaks a value; the file round-trips).

// online-api.mjs / online-config.mjs are plain ESM with no types — imported dynamically so each config
// test can point ONLINE_KEYS_FILE at its own temp file BEFORE the module reads it on boot.

describe('TASK 12.4 — createBoundedFrameQueue caps the queue and keeps the newest frames', () => {
  it('drops the OLDEST frame at capacity, preserves order, and counts drops', async () => {
    const { createBoundedFrameQueue } = await import('../server/online-api.mjs')
    const q = createBoundedFrameQueue(3)
    for (let i = 0; i < 5; i++) q.push(`f${i}`)
    expect(q.size).toBe(3)
    expect(q.dropped).toBe(2)
    expect(q.drain()).toEqual(['f2', 'f3', 'f4']) // f0,f1 dropped (oldest); newest three kept, in order
    expect(q.size).toBe(0)
    expect(q.dropped).toBe(2) // drain does not reset the drop counter
  })

  it('never grows past the cap no matter how many frames arrive', async () => {
    const { createBoundedFrameQueue } = await import('../server/online-api.mjs')
    const q = createBoundedFrameQueue(20)
    for (let i = 0; i < 1000; i++) q.push(i)
    expect(q.size).toBe(20)
    expect(q.dropped).toBe(980)
    expect(q.drain()).toEqual(Array.from({ length: 20 }, (_, i) => 980 + i))
  })
})

describe('TASK 12.1 — a wrong-door upgrade is closed, not left pending', () => {
  it('writes 400 and destroys the socket for an unclaimed path (ours is the only listener)', async () => {
    const { installOnlineApi } = await import('../server/online-api.mjs')
    const server = new EventEmitter()
    installOnlineApi(server, {}) // attaches exactly one 'upgrade' listener
    const writes: string[] = []
    let destroyed = false
    const socket = { write: (s: string) => { writes.push(s); return true }, destroy: () => { destroyed = true } }
    server.emit('upgrade', { url: '/online-api/nonsense', headers: {} }, socket, Buffer.alloc(0))
    expect(destroyed).toBe(true)
    expect(writes.join('')).toContain('400')
  })

  it('stays polite (no destroy) when a second upgrade listener is attached', async () => {
    const { installOnlineApi } = await import('../server/online-api.mjs')
    const server = new EventEmitter()
    installOnlineApi(server, {})
    server.on('upgrade', () => {}) // someone else mounts a listener → listenerCount === 2
    let destroyed = false
    const socket = { write: () => true, destroy: () => { destroyed = true } }
    server.emit('upgrade', { url: '/online-api/nonsense', headers: {} }, socket, Buffer.alloc(0))
    expect(destroyed).toBe(false)
  })
})

describe('TASK 12.8 — online-config is write-only and round-trips on disk', () => {
  const tmp = path.join(os.tmpdir(), `proyaku-keys-test-${process.pid}.json`)
  beforeEach(() => { try { fs.rmSync(tmp) } catch { /* not there yet */ } })

  it('exposes the six opaque slugs — never an env name', async () => {
    process.env.ONLINE_KEYS_FILE = tmp
    vi.resetModules()
    const cfg = await import('../server/online-config.mjs')
    expect(cfg.ONLINE_KEY_SLUGS).toEqual(['asr_endpoint', 'asr_key', 'refine_key', 'tts_key', 'tts_voice_ja', 'tts_voice_vi'])
    expect(cfg.ONLINE_KEY_SLUGS.join(',')).not.toMatch(/OPENAI|ELEVENLABS|QWEN/i)
  })

  it('refuses an unknown slug, never returns the stored value, and reads back from disk', async () => {
    process.env.ONLINE_KEYS_FILE = tmp
    vi.resetModules()
    let cfg = await import('../server/online-config.mjs')

    // unknown slug → error, nothing stored
    expect(cfg.setOnlineConfig({ bogus: 'x' })).toHaveProperty('error')

    const SECRET = 'sk-super-secret-value-123'
    expect(cfg.setOnlineConfig({ refine_key: SECRET }).changed).toContain('refine_key')

    // config-status reports booleans only — the value must never appear anywhere in it
    const status = cfg.getConfigStatus(['refine_key'])
    expect(status.keys.refine_key).toBe(true)
    expect(status.ready).toBe(true)
    expect(JSON.stringify(status)).not.toContain(SECRET)

    // round-trip: a FRESH module load reads the value back from disk on boot
    vi.resetModules()
    cfg = await import('../server/online-config.mjs')
    expect(cfg.getConfigStatus(['refine_key']).keys.refine_key).toBe(true)

    // the on-disk file is keyed by ENV NAME (not the client slug) and holds the value under it
    const onDisk = JSON.parse(fs.readFileSync(tmp, 'utf8'))
    expect(onDisk.OPENAI_API_KEY).toBe(SECRET)
    expect(onDisk.refine_key).toBeUndefined()
  })

  it('an empty string clears a runtime value (env fallback then applies)', async () => {
    process.env.ONLINE_KEYS_FILE = tmp
    vi.resetModules()
    const cfg = await import('../server/online-config.mjs')
    cfg.setOnlineConfig({ tts_key: 'abc' })
    expect(cfg.getConfigStatus(['tts_key']).keys.tts_key).toBe(true)
    cfg.setOnlineConfig({ tts_key: '' })
    // with no ELEVENLABS_API_KEY env in the test process, clearing leaves it unset
    if (!process.env.ELEVENLABS_API_KEY) expect(cfg.getConfigStatus(['tts_key']).keys.tts_key).toBe(false)
  })
})
