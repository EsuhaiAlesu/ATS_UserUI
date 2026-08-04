// TASK 16 — "Preview refine failed." was the same sentence for four completely different situations. The
// server now classifies the cause into a deliberately coarse code, and the client turns that code into a
// sentence naming the action. The code must leak nothing: no provider, no model id, no host, no env var.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { refineReasonText } from '../src/lib/lanes/online/refineFailure';

const { classifyRefineFailure } = await import('../server/online-api.mjs');

const SERVER = readFileSync(new URL('../server/online-api.mjs', import.meta.url), 'utf8');
const LANE = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');

describe('the server classifies', () => {
  it('recognises a missing key', () => {
    expect(classifyRefineFailure(new Error('Refine is not configured.'))).toBe('no-key');
  });

  it('recognises a timeout, however it arrives', () => {
    expect(classifyRefineFailure(new Error('The operation was aborted'))).toBe('timeout');
    expect(classifyRefineFailure({ name: 'AbortError', message: 'This operation was aborted' })).toBe('timeout');
  });

  it('keeps the upstream status number and nothing else', () => {
    expect(classifyRefineFailure(new Error('upstream HTTP 429'))).toBe('upstream-http-429');
    expect(classifyRefineFailure(new Error('status 503'))).toBe('upstream-http-503');
  });

  it('recognises an unusable answer', () => {
    expect(classifyRefineFailure(new Error('Unexpected token < in JSON at position 0'))).toBe('bad-json');
  });

  it('falls back to unknown, and does not throw on nothing at all', () => {
    expect(classifyRefineFailure(new Error('something nobody predicted'))).toBe('unknown');
    expect(() => classifyRefineFailure(undefined)).not.toThrow();
    expect(() => classifyRefineFailure(null)).not.toThrow();
    expect(classifyRefineFailure(undefined)).toBe('unknown');
    expect(classifyRefineFailure(null)).toBe('unknown');
  });

  it('puts the key first, because that is the one waiting cannot fix', () => {
    expect(classifyRefineFailure(new Error('Refine is not configured (HTTP 401)'))).toBe('no-key');
  });
});

describe('it leaks nothing', () => {
  it('lets nothing from the message survive into the code', () => {
    const noisy = new Error('POST https://api.some-vendor.example/v1/chat failed: model some-model-2026-01 rejected, SOME_VENDOR_API_KEY invalid, HTTP 403');
    const code = classifyRefineFailure(noisy);
    expect(code).toMatch(/^(no-key|timeout|bad-json|unknown|upstream-http-\d{3})$/);
  });

  it('sends the code on the 502 and nothing more', () => {
    expect(SERVER).toContain("sendJson(res, 502, { error: 'Preview refine failed.', reason });");
  });
});

describe('the operator reads a sentence, not a code', () => {
  it('names who to tell, and says the draft is still up', () => {
    expect(refineReasonText('no-key')).toContain('quản trị');
    expect(refineReasonText('timeout')).toContain('nháp');
  });

  it('says what to do about each upstream status', () => {
    expect(refineReasonText('upstream-http-429')).toContain('429');
    expect(refineReasonText('upstream-http-429')).toContain('thử lại');
    expect(refineReasonText('upstream-http-401')).toContain('401');
    expect(refineReasonText('upstream-http-401')).toContain('quản trị');
    expect(refineReasonText('upstream-http-403')).toContain('403');
    expect(refineReasonText('upstream-http-403')).toContain('quản trị');
    expect(refineReasonText('upstream-http-500')).toBe('bên dịch trả lỗi 500');
  });

  it('never returns an empty string, which would reach the screen as a blank error', () => {
    expect(refineReasonText('')).toBe('lỗi không rõ từ bên dịch');
    expect(refineReasonText('something-else-entirely')).toBe('lỗi không rõ từ bên dịch');
  });

  it('is what the lane actually uses', () => {
    expect(LANE).toContain('refineReasonText(reason)');
    expect(LANE).toContain("import { refineReasonText } from './refineFailure';");
  });
});
