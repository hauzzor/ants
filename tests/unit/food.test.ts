import { describe, it, expect } from 'vitest'
import {
  createFood,
  totalFood,
  findFoodAt,
  takeFood,
  pruneDepleted,
} from '../../src/sim/food'

describe('createFood', () => {
  it('stores its position and amount', () => {
    expect(createFood(3, 10, 20, 50)).toEqual({ id: 3, x: 10, y: 20, amount: 50 })
  })
})

describe('totalFood', () => {
  it('sums the amount across sources', () => {
    expect(totalFood([createFood(0, 0, 0, 10), createFood(1, 1, 1, 5)])).toBe(15)
  })

  it('is zero for no sources', () => {
    expect(totalFood([])).toBe(0)
  })
})

describe('findFoodAt', () => {
  const foods = [createFood(0, 10, 10, 5), createFood(1, 20, 10, 5)]

  it('finds the nearest source within the radius', () => {
    expect(findFoodAt(foods, 12, 10, 4)?.id).toBe(0)
    expect(findFoodAt(foods, 18, 10, 4)?.id).toBe(1)
  })

  it('returns undefined when nothing is close enough', () => {
    expect(findFoodAt(foods, 100, 100, 4)).toBeUndefined()
  })
})

describe('takeFood', () => {
  it('removes up to the requested amount', () => {
    const food = createFood(0, 0, 0, 5)
    expect(takeFood(food, 3)).toBe(3)
    expect(food.amount).toBe(2)
  })

  it('never removes more than is available', () => {
    const food = createFood(0, 0, 0, 2)
    expect(takeFood(food, 10)).toBe(2)
    expect(food.amount).toBe(0)
  })
})

describe('pruneDepleted', () => {
  it('drops empty sources', () => {
    const foods = [createFood(0, 0, 0, 0), createFood(1, 1, 1, 4)]
    expect(pruneDepleted(foods).map((f) => f.id)).toEqual([1])
  })
})
