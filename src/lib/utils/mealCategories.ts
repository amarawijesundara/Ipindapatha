/**
 * Meal Period Utilities
 * Simplified utilities for meal period management in the new system
 * where meal periods are the primary booking unit
 */

import { MealPeriodId, MealPeriod } from '@/types'

/**
 * Authentic Monastic Meal Schedule
 * Based on traditional Buddhist monastic practices
 */
export const MEAL_PERIODS: Record<MealPeriodId, MealPeriod> = {
  morning_meal: {
    id: 'morning_meal',
    name: 'Morning Meal',
    icon: '🌅',
    timeRange: '6:30 AM - 7:30 AM',
    description: 'First meal of the day',
    color: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  morning_tea: {
    id: 'morning_tea',
    name: 'Morning Tea',
    icon: '🍵',
    timeRange: '9:30 AM - 10:30 AM',
    description: 'Morning refreshment',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  lunch_meal: {
    id: 'lunch_meal',
    name: 'Lunch Meal',
    icon: '🍽️',
    timeRange: '11:30 AM - 12:00 PM',
    description: 'Main meal - last food before evening',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  evening_tea: {
    id: 'evening_tea',
    name: 'Evening Tea',
    icon: '☕',
    timeRange: '3:00 PM - 4:00 PM',
    description: 'Final refreshment of the day',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  }
}

/**
 * All meal periods in chronological order
 */
export const MEAL_PERIOD_ORDER: MealPeriodId[] = [
  'morning_meal',
  'morning_tea',
  'lunch_meal',
  'evening_tea'
]

/**
 * Get meal period information by ID
 */
export function getMealPeriodInfo(mealPeriodId: MealPeriodId): MealPeriod {
  return MEAL_PERIODS[mealPeriodId]
}

/**
 * Get all meal periods as an array
 */
export function getAllMealPeriods(): MealPeriod[] {
  return MEAL_PERIOD_ORDER.map(id => MEAL_PERIODS[id])
}

/**
 * Format meal period ID to display name
 */
export function formatMealPeriodName(mealPeriodId: MealPeriodId): string {
  return MEAL_PERIODS[mealPeriodId].name
}

/**
 * Validate if a meal period ID is valid
 */
export function isValidMealPeriod(mealPeriodId: string): mealPeriodId is MealPeriodId {
  return mealPeriodId in MEAL_PERIODS
}

/**
 * Get default meal costs (can be overridden in tenant settings)
 */
export const DEFAULT_MEAL_COSTS: Record<MealPeriodId, number> = {
  morning_meal: 75,
  morning_tea: 25,
  lunch_meal: 100,
  evening_tea: 30
}

/**
 * Calculate total cost for selected meal periods
 */
export function calculateMealCosts(
  mealPeriods: MealPeriodId[],
  costs: Record<string, number> = DEFAULT_MEAL_COSTS
): number {
  return mealPeriods.reduce((total, periodId) => {
    return total + (costs[periodId] || DEFAULT_MEAL_COSTS[periodId] || 0)
  }, 0)
}

/**
 * Get meal period by time (legacy support - not recommended for new code)
 */
export function getMealPeriodByTime(time: string): MealPeriodId | null {
  // Legacy time mapping for backward compatibility
  const timeToMealPeriod: Record<string, MealPeriodId> = {
    '06:30': 'morning_meal',
    '07:00': 'morning_meal',
    '07:30': 'morning_meal',
    '09:30': 'morning_tea',
    '10:00': 'morning_tea',
    '10:30': 'morning_tea',
    '11:30': 'lunch_meal',
    '12:00': 'lunch_meal',
    '15:00': 'evening_tea',
    '15:30': 'evening_tea',
    '16:00': 'evening_tea'
  }

  return timeToMealPeriod[time] || null
}

/**
 * Get simplified meal period display for UI
 */
export function getMealPeriodDisplay(mealPeriodId: MealPeriodId) {
  const period = MEAL_PERIODS[mealPeriodId]
  return {
    id: period.id,
    name: period.name,
    icon: period.icon,
    timeRange: period.timeRange,
    description: period.description,
    color: period.color,
    cost: DEFAULT_MEAL_COSTS[period.id]
  }
}

/**
 * Check if meal follows monastic principles
 * (No solid food after 12:00 PM, only tea/drinks allowed)
 */
export function isValidMonasticMeal(mealPeriodId: MealPeriodId): boolean {
  // All defined meal periods follow monastic principles
  return isValidMealPeriod(mealPeriodId)
}

/**
 * Get meal periods that allow solid food
 */
export function getSolidFoodMealPeriods(): MealPeriodId[] {
  return ['morning_meal', 'lunch_meal']
}

/**
 * Get meal periods that are only drinks/tea
 */
export function getTeaMealPeriods(): MealPeriodId[] {
  return ['morning_tea', 'evening_tea']
}

/**
 * Convert legacy time slots to meal periods (for migration)
 */
export function convertTimeSlotsToMealPeriods(timeSlots: string[]): MealPeriodId[] {
  const mealPeriods = new Set<MealPeriodId>()

  timeSlots.forEach(timeSlot => {
    const mealPeriod = getMealPeriodByTime(timeSlot)
    if (mealPeriod) {
      mealPeriods.add(mealPeriod)
    }
  })

  // Return in chronological order
  return MEAL_PERIOD_ORDER.filter(periodId => mealPeriods.has(periodId))
}

/**
 * Convert meal period to representative time string for recurring bookings
 * Returns the default time for each meal period
 */
export function getMealPeriodDefaultTime(mealPeriodId: MealPeriodId): string {
  const mealPeriodToTime: Record<MealPeriodId, string> = {
    morning_meal: '07:00',    // 7:00 AM
    morning_tea: '10:00',     // 10:00 AM
    lunch_meal: '11:30',      // 11:30 AM
    evening_tea: '15:30'      // 3:30 PM
  }

  return mealPeriodToTime[mealPeriodId]
}