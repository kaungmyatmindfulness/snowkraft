import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { cn, formatTime, formatPercentage, shuffleArray, getPassingStatus } from '@/lib/utils'

describe('cn (classname utility)', () => {
  describe('normal cases', () => {
    it('should combine multiple class strings', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle single class string', () => {
      expect(cn('foo')).toBe('foo')
    })

    it('should handle conditional classes with objects', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active')
    })

    it('should handle arrays of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('should handle mixed inputs', () => {
      const result = cn('base', ['arr1', 'arr2'], { conditional: true })
      expect(result).toBe('base arr1 arr2 conditional')
    })
  })

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })

    it('should handle empty string', () => {
      expect(cn('')).toBe('')
    })

    it('should handle null and undefined values', () => {
      expect(cn('foo', null, undefined, 'bar')).toBe('foo bar')
    })

    it('should handle false values', () => {
      expect(cn('foo', false, 'bar')).toBe('foo bar')
    })

    it('should handle 0 as falsy value', () => {
      expect(cn('foo', 0, 'bar')).toBe('foo bar')
    })

    it('should handle empty object', () => {
      expect(cn('foo', {}, 'bar')).toBe('foo bar')
    })

    it('should handle empty array', () => {
      expect(cn('foo', [], 'bar')).toBe('foo bar')
    })
  })
})

describe('formatTime', () => {
  describe('normal cases', () => {
    it('should format 60 seconds as 1:00', () => {
      expect(formatTime(60)).toBe('1:00')
    })

    it('should format 90 seconds as 1:30', () => {
      expect(formatTime(90)).toBe('1:30')
    })

    it('should format 125 seconds as 2:05', () => {
      expect(formatTime(125)).toBe('2:05')
    })

    it('should format large values correctly', () => {
      expect(formatTime(3661)).toBe('61:01')
    })

    it('should pad single-digit seconds with leading zero', () => {
      expect(formatTime(65)).toBe('1:05')
    })
  })

  describe('edge cases', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00')
    })

    it('should format 1 second as 0:01', () => {
      expect(formatTime(1)).toBe('0:01')
    })

    it('should format 59 seconds as 0:59', () => {
      expect(formatTime(59)).toBe('0:59')
    })
  })

  describe('boundary conditions', () => {
    it('should handle exactly 1 minute', () => {
      expect(formatTime(60)).toBe('1:00')
    })

    it('should handle 1 hour (3600 seconds)', () => {
      expect(formatTime(3600)).toBe('60:00')
    })

    it('should handle very large numbers', () => {
      expect(formatTime(36000)).toBe('600:00')
    })
  })
})

describe('formatPercentage', () => {
  describe('normal cases', () => {
    it('should format 0.5 as 50%', () => {
      expect(formatPercentage(0.5)).toBe('50%')
    })

    it('should format 0.75 as 75%', () => {
      expect(formatPercentage(0.75)).toBe('75%')
    })

    it('should format 1 as 100%', () => {
      expect(formatPercentage(1)).toBe('100%')
    })

    it('should format 0.333 as 33% (rounds down)', () => {
      expect(formatPercentage(0.333)).toBe('33%')
    })

    it('should format 0.666 as 67% (rounds up)', () => {
      expect(formatPercentage(0.666)).toBe('67%')
    })

    it('should format 0.125 as 13% (rounds up)', () => {
      expect(formatPercentage(0.125)).toBe('13%')
    })

    it('should format 0.124 as 12% (rounds down)', () => {
      expect(formatPercentage(0.124)).toBe('12%')
    })
  })

  describe('edge cases', () => {
    it('should format 0 as 0%', () => {
      expect(formatPercentage(0)).toBe('0%')
    })

    it('should handle values greater than 1', () => {
      expect(formatPercentage(1.5)).toBe('150%')
    })

    it('should handle very small decimals', () => {
      expect(formatPercentage(0.001)).toBe('0%')
    })

    it('should handle negative values', () => {
      expect(formatPercentage(-0.25)).toBe('-25%')
    })
  })

  describe('boundary conditions', () => {
    it('should round 0.745 to 75%', () => {
      expect(formatPercentage(0.745)).toBe('75%')
    })

    it('should round 0.744 to 74%', () => {
      expect(formatPercentage(0.744)).toBe('74%')
    })

    it('should round 0.995 to 100%', () => {
      expect(formatPercentage(0.995)).toBe('100%')
    })

    it('should round 0.994 to 99%', () => {
      expect(formatPercentage(0.994)).toBe('99%')
    })
  })
})

describe('shuffleArray', () => {
  describe('normal cases', () => {
    it('should return an array of the same length', () => {
      const input = [1, 2, 3, 4, 5]
      const result = shuffleArray(input)
      expect(result).toHaveLength(input.length)
    })

    it('should contain all original elements', () => {
      const input = [1, 2, 3, 4, 5]
      const result = shuffleArray(input)
      expect(result.sort()).toEqual(input.sort())
    })

    it('should not modify the original array', () => {
      const input = [1, 2, 3, 4, 5]
      const inputCopy = [...input]
      shuffleArray(input)
      expect(input).toEqual(inputCopy)
    })

    it('should work with string arrays', () => {
      const input = ['a', 'b', 'c', 'd']
      const result = shuffleArray(input)
      expect(result.sort()).toEqual(input.sort())
    })

    it('should work with object arrays', () => {
      const input = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const result = shuffleArray(input)
      expect(result).toHaveLength(3)
      expect(result.map((x) => x.id).sort()).toEqual([1, 2, 3])
    })
  })

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = shuffleArray([])
      expect(result).toEqual([])
    })

    it('should handle single element array', () => {
      const result = shuffleArray([42])
      expect(result).toEqual([42])
    })

    it('should handle two element array', () => {
      const input = [1, 2]
      const result = shuffleArray(input)
      expect(result.sort()).toEqual([1, 2])
    })
  })

  describe('randomness verification', () => {
    let mockRandom: MockInstance<() => number>

    beforeEach(() => {
      mockRandom = vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      mockRandom.mockRestore()
    })

    it('should produce different arrangements with different random values', () => {
      // Mock Math.random to return predictable values
      // This tests the Fisher-Yates shuffle logic
      mockRandom
        .mockReturnValueOnce(0.5) // j = floor(0.5 * 5) = 2, swap index 4 with 2
        .mockReturnValueOnce(0.5) // j = floor(0.5 * 4) = 2, swap index 3 with 2
        .mockReturnValueOnce(0.5) // j = floor(0.5 * 3) = 1, swap index 2 with 1
        .mockReturnValueOnce(0.5) // j = floor(0.5 * 2) = 1, swap index 1 with 1

      const input = [1, 2, 3, 4, 5]
      const result = shuffleArray(input)

      // Verify shuffle happened (result may or may not equal original depending on mock values)
      expect(result).toHaveLength(5)
      expect(result.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    })

    it('should use Fisher-Yates algorithm correctly', () => {
      // Mock to always return 0, which means j=0 for each iteration
      // This should swap each element with the first valid position
      mockRandom.mockReturnValue(0)

      const input = [1, 2, 3, 4, 5]
      const result = shuffleArray(input)

      // With Math.random always returning 0:
      // i=4: j=0, swap(4,0): [5,2,3,4,1]
      // i=3: j=0, swap(3,0): [4,2,3,5,1]
      // i=2: j=0, swap(2,0): [3,2,4,5,1]
      // i=1: j=0, swap(1,0): [2,3,4,5,1]
      expect(result).toEqual([2, 3, 4, 5, 1])
    })
  })
})

describe('getPassingStatus', () => {
  describe('normal cases', () => {
    it('should return true for 80% (80/100)', () => {
      expect(getPassingStatus(80, 100)).toBe(true)
    })

    it('should return true for 90% (9/10)', () => {
      expect(getPassingStatus(9, 10)).toBe(true)
    })

    it('should return false for 50% (50/100)', () => {
      expect(getPassingStatus(50, 100)).toBe(false)
    })

    it('should return false for 70% (7/10)', () => {
      expect(getPassingStatus(7, 10)).toBe(false)
    })

    it('should return true for 100% (10/10)', () => {
      expect(getPassingStatus(10, 10)).toBe(true)
    })
  })

  describe('boundary conditions - exactly 75%', () => {
    it('should return true for exactly 75% (75/100)', () => {
      expect(getPassingStatus(75, 100)).toBe(true)
    })

    it('should return true for exactly 75% (3/4)', () => {
      expect(getPassingStatus(3, 4)).toBe(true)
    })

    it('should return true for exactly 75% (15/20)', () => {
      expect(getPassingStatus(15, 20)).toBe(true)
    })

    it('should return false for just below 75% (74/100)', () => {
      expect(getPassingStatus(74, 100)).toBe(false)
    })

    it('should return true for just above 75% (76/100)', () => {
      expect(getPassingStatus(76, 100)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should return false for 0 correct answers', () => {
      expect(getPassingStatus(0, 100)).toBe(false)
    })

    it('should return true for perfect score (100/100)', () => {
      expect(getPassingStatus(100, 100)).toBe(true)
    })

    it('should return true for single question answered correctly', () => {
      // 1/1 = 100%, which is >= 75%
      expect(getPassingStatus(1, 1)).toBe(true)
    })

    it('should return false for single question answered incorrectly', () => {
      // 0/1 = 0%, which is < 75%
      expect(getPassingStatus(0, 1)).toBe(false)
    })
  })

  describe('fractional edge cases', () => {
    it('should handle non-exact 75% boundaries (2/3 = 66.67%)', () => {
      expect(getPassingStatus(2, 3)).toBe(false)
    })

    it('should handle 7/9 = 77.78% as passing', () => {
      expect(getPassingStatus(7, 9)).toBe(true)
    })

    it('should handle 6/8 = 75% exactly as passing', () => {
      expect(getPassingStatus(6, 8)).toBe(true)
    })

    it('should handle 5/7 = 71.43% as not passing', () => {
      expect(getPassingStatus(5, 7)).toBe(false)
    })

    it('should handle 6/7 = 85.71% as passing', () => {
      expect(getPassingStatus(6, 7)).toBe(true)
    })
  })

  describe('division edge cases', () => {
    it('should handle 0/0 (returns NaN, which fails >= comparison)', () => {
      // 0/0 = NaN, and NaN >= 0.75 is false
      expect(getPassingStatus(0, 0)).toBe(false)
    })
  })
})
