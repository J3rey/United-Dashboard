import { describe, it, expect } from 'vitest'
import {
  rowToContent, contentToRow, toISODate, todayISO, monthGrid,
  formatPostDate, refHref, refHost,
} from './contentFields.js'

describe('rowToContent', () => {
  it('maps a full row', () => {
    expect(rowToContent({
      id: 'u1', idea: 'waves', pillar_id: 'p4', status: 'Scripted', notes: 'n',
      post_date: '2026-09-23', ref_url: 'https://x.com/r', twist: 't',
      orig_script: 'o', script: 's', user_id: 'z', sort_order: 3,
    })).toEqual({
      id: 'u1', idea: 'waves', pillarId: 'p4', status: 'Scripted', notes: 'n',
      postDate: '2026-09-23', refUrl: 'https://x.com/r', twist: 't',
      origScript: 'o', script: 's',
    })
  })
  it('turns nulls and missing columns into empty strings', () => {
    const c = rowToContent({ id: 1, idea: 'a', pillar_id: 2, status: 'Idea', notes: null })
    expect(c).toMatchObject({ notes: '', postDate: '', refUrl: '', twist: '', origScript: '', script: '' })
  })
})

describe('contentToRow', () => {
  it('maps only the keys given', () => {
    expect(contentToRow({ script: 'hello' })).toEqual({ script: 'hello' })
    expect(contentToRow({ pillarId: 5, origScript: 'o' })).toEqual({ pillar_id: 5, orig_script: 'o' })
  })
  it('sends null for cleared new fields but keeps empty notes as empty string', () => {
    expect(contentToRow({ postDate: '', refUrl: '', notes: '' }))
      .toEqual({ post_date: null, ref_url: null, notes: '' })
  })
  it('ignores unknown keys', () => {
    expect(contentToRow({ id: 1, bogus: 2, idea: 'x' })).toEqual({ idea: 'x' })
  })
  it('round-trips', () => {
    const item = { idea: 'a', pillarId: 1, status: 'Idea', notes: '', postDate: '2026-01-05', refUrl: '', twist: '', origScript: '', script: 's' }
    expect(rowToContent({ id: 9, ...contentToRow(item) })).toEqual({ id: 9, ...item })
  })
})

describe('dates', () => {
  it('zero-pads', () => expect(toISODate(2026, 0, 5)).toBe('2026-01-05'))
  it('todayISO uses local parts', () => {
    expect(todayISO(new Date(2026, 8, 19, 23, 59))).toBe('2026-09-19')
    expect(todayISO(new Date(2026, 8, 19, 0, 1))).toBe('2026-09-19')
  })
  it('Sep 2026 starts on Tuesday with 30 days', () => {
    const g = monthGrid(2026, 8)
    expect(g.length).toBe(35)
    expect(g.slice(0, 3)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01'])
    expect(g[31]).toBe('2026-09-30')
    expect(g.slice(32)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
  })
  it('Nov 2026 starts on Sunday', () => {
    const g = monthGrid(2026, 10)
    expect(g[0]).toBe('2026-11-01')
    expect(g.length % 7).toBe(0)
    expect(g[g.length - 1]).toBe('2026-12-05')
  })
  it('handles leap February', () => {
    const g = monthGrid(2028, 1)
    expect(g).toContain('2028-02-29')
    expect(g).not.toContain('2028-02-30')
    expect(g.length % 7).toBe(0)
  })
  it('formats a post date', () => expect(formatPostDate('2026-09-23')).toBe('Wed, Sep 23'))
})

describe('reference url', () => {
  it('prefixes bare domains', () => {
    expect(refHref('instagram.com/reel/abc')).toBe('https://instagram.com/reel/abc')
    expect(refHost('instagram.com/reel/abc')).toBe('instagram.com')
  })
  it('keeps http(s) and strips www from host', () => {
    expect(refHref('  https://www.tiktok.com/@a/video/1 ')).toBe('https://www.tiktok.com/@a/video/1')
    expect(refHost('https://www.tiktok.com/@a/video/1')).toBe('tiktok.com')
  })
  it('rejects non-http schemes and junk', () => {
    expect(refHref('javascript:alert(1)')).toBe('')
    expect(refHref('data:text/html,hi')).toBe('')
    expect(refHref('')).toBe('')
    expect(refHost('not a url')).toBe('')
  })
})
