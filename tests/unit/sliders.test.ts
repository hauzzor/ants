import { describe, expect, it } from 'vitest'
import { SIM_SLIDERS, SPECIAL_SLIDERS } from '../../src/ui/sliderMeta'
import { sliderRow } from '../../src/ui/sliders'

const ALL_SLIDERS = [...SIM_SLIDERS, ...SPECIAL_SLIDERS]

function labelFragment(html: string): string {
  const start = html.indexOf('<label')
  const end = html.indexOf('</label>')
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return html.slice(start, end)
}

describe('slider row markup', () => {
  it('associates the label with the range input by id', () => {
    for (const meta of ALL_SLIDERS) {
      const id = `slider-${meta.key}`
      const html = sliderRow(meta, meta.min)
      expect(html, `label for ${id}`).toContain(`<label class="slider-label" for="${id}">`)
      expect(html, `input for ${id}`).toContain(`<input type="range" id="${id}" data-testid="${id}"`)
      expect(html, `describedby for ${id}`).toContain(`aria-describedby="slider-desc-${meta.key}"`)
      expect(html, `bounds for ${id}`).toContain(
        `min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${meta.min}"`,
      )
    }
  })

  it('keeps the description outside the label', () => {
    for (const meta of ALL_SLIDERS) {
      const html = sliderRow(meta, 1)
      const label = labelFragment(html)
      expect(label, `value span for ${meta.key}`).toContain(`data-sv="slider-${meta.key}"`)
      expect(label, `description leaked into label for ${meta.key}`).not.toContain(meta.description)
      expect(label, `description id leaked into label for ${meta.key}`).not.toContain('slider-desc')
      expect(html.indexOf('</label>')).toBeLessThan(html.indexOf('<span class="slider-desc"'))
      expect(html).toContain(
        `<span class="slider-desc" id="slider-desc-${meta.key}" data-testid="slider-desc-${meta.key}"`,
      )
    }
  })

  it('renders a unique id for every element', () => {
    const ids = ALL_SLIDERS.flatMap((meta) => sliderRow(meta, 0).match(/\sid="[^"]+"/g) ?? [])
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
