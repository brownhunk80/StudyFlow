/**
 * Comprehensive Dimensional Unit Conversion Utility for Mathematical & Scientific Verification
 * Handles unit parsing, dimensional compatibility checking, SI base conversions,
 * and friendly human-readable equivalence feedback strings.
 */

export type DimensionCategory =
  | 'length'
  | 'mass'
  | 'time'
  | 'speed'
  | 'acceleration'
  | 'force'
  | 'energy'
  | 'power'
  | 'pressure'
  | 'voltage'
  | 'current'
  | 'resistance'
  | 'capacitance'
  | 'charge'
  | 'frequency'
  | 'angle'
  | 'temperature';

export interface UnitDefinition {
  canonical: string;
  dimension: DimensionCategory;
  /** Multiplier to convert 1 unit of this to the dimension's base SI unit (e.g., km -> m is 1000) */
  toBaseFactor: number;
  /** Offset for linear scales with non-zero intercept (e.g. Celsius to Kelvin is 273.15) */
  offset?: number;
  displaySymbol: string;
  name: string;
}

/**
 * Standard Unit Registry mapping aliases & symbols to UnitDefinitions
 */
export const UNIT_REGISTRY: Record<string, UnitDefinition> = {
  // === LENGTH (Base: meter 'm') ===
  'm': { canonical: 'm', dimension: 'length', toBaseFactor: 1, displaySymbol: 'm', name: 'meters' },
  'meter': { canonical: 'm', dimension: 'length', toBaseFactor: 1, displaySymbol: 'm', name: 'meters' },
  'meters': { canonical: 'm', dimension: 'length', toBaseFactor: 1, displaySymbol: 'm', name: 'meters' },
  'metre': { canonical: 'm', dimension: 'length', toBaseFactor: 1, displaySymbol: 'm', name: 'meters' },
  'metres': { canonical: 'm', dimension: 'length', toBaseFactor: 1, displaySymbol: 'm', name: 'meters' },

  'km': { canonical: 'km', dimension: 'length', toBaseFactor: 1000, displaySymbol: 'km', name: 'kilometers' },
  'kilometer': { canonical: 'km', dimension: 'length', toBaseFactor: 1000, displaySymbol: 'km', name: 'kilometers' },
  'kilometers': { canonical: 'km', dimension: 'length', toBaseFactor: 1000, displaySymbol: 'km', name: 'kilometers' },

  'cm': { canonical: 'cm', dimension: 'length', toBaseFactor: 0.01, displaySymbol: 'cm', name: 'centimeters' },
  'centimeter': { canonical: 'cm', dimension: 'length', toBaseFactor: 0.01, displaySymbol: 'cm', name: 'centimeters' },
  'centimeters': { canonical: 'cm', dimension: 'length', toBaseFactor: 0.01, displaySymbol: 'cm', name: 'centimeters' },

  'mm': { canonical: 'mm', dimension: 'length', toBaseFactor: 0.001, displaySymbol: 'mm', name: 'millimeters' },
  'millimeter': { canonical: 'mm', dimension: 'length', toBaseFactor: 0.001, displaySymbol: 'mm', name: 'millimeters' },
  'millimeters': { canonical: 'mm', dimension: 'length', toBaseFactor: 0.001, displaySymbol: 'mm', name: 'millimeters' },

  'μm': { canonical: 'μm', dimension: 'length', toBaseFactor: 1e-6, displaySymbol: 'μm', name: 'micrometers' },
  'um': { canonical: 'μm', dimension: 'length', toBaseFactor: 1e-6, displaySymbol: 'μm', name: 'micrometers' },
  'micrometer': { canonical: 'μm', dimension: 'length', toBaseFactor: 1e-6, displaySymbol: 'μm', name: 'micrometers' },
  'micron': { canonical: 'μm', dimension: 'length', toBaseFactor: 1e-6, displaySymbol: 'μm', name: 'microns' },

  'nm': { canonical: 'nm', dimension: 'length', toBaseFactor: 1e-9, displaySymbol: 'nm', name: 'nanometers' },
  'nanometer': { canonical: 'nm', dimension: 'length', toBaseFactor: 1e-9, displaySymbol: 'nm', name: 'nanometers' },

  'in': { canonical: 'in', dimension: 'length', toBaseFactor: 0.0254, displaySymbol: 'in', name: 'inches' },
  'inch': { canonical: 'in', dimension: 'length', toBaseFactor: 0.0254, displaySymbol: 'in', name: 'inches' },
  'inches': { canonical: 'in', dimension: 'length', toBaseFactor: 0.0254, displaySymbol: 'in', name: 'inches' },

  'ft': { canonical: 'ft', dimension: 'length', toBaseFactor: 0.3048, displaySymbol: 'ft', name: 'feet' },
  'foot': { canonical: 'ft', dimension: 'length', toBaseFactor: 0.3048, displaySymbol: 'ft', name: 'feet' },
  'feet': { canonical: 'ft', dimension: 'length', toBaseFactor: 0.3048, displaySymbol: 'ft', name: 'feet' },

  'yd': { canonical: 'yd', dimension: 'length', toBaseFactor: 0.9144, displaySymbol: 'yd', name: 'yards' },
  'yard': { canonical: 'yd', dimension: 'length', toBaseFactor: 0.9144, displaySymbol: 'yd', name: 'yards' },

  'mi': { canonical: 'mi', dimension: 'length', toBaseFactor: 1609.344, displaySymbol: 'mi', name: 'miles' },
  'mile': { canonical: 'mi', dimension: 'length', toBaseFactor: 1609.344, displaySymbol: 'mi', name: 'miles' },
  'miles': { canonical: 'mi', dimension: 'length', toBaseFactor: 1609.344, displaySymbol: 'mi', name: 'miles' },

  // === MASS (Base: kilogram 'kg') ===
  'kg': { canonical: 'kg', dimension: 'mass', toBaseFactor: 1, displaySymbol: 'kg', name: 'kilograms' },
  'kilogram': { canonical: 'kg', dimension: 'mass', toBaseFactor: 1, displaySymbol: 'kg', name: 'kilograms' },
  'kilograms': { canonical: 'kg', dimension: 'mass', toBaseFactor: 1, displaySymbol: 'kg', name: 'kilograms' },

  'g': { canonical: 'g', dimension: 'mass', toBaseFactor: 0.001, displaySymbol: 'g', name: 'grams' },
  'gram': { canonical: 'g', dimension: 'mass', toBaseFactor: 0.001, displaySymbol: 'g', name: 'grams' },
  'grams': { canonical: 'g', dimension: 'mass', toBaseFactor: 0.001, displaySymbol: 'g', name: 'grams' },

  'mg': { canonical: 'mg', dimension: 'mass', toBaseFactor: 1e-6, displaySymbol: 'mg', name: 'milligrams' },
  'milligram': { canonical: 'mg', dimension: 'mass', toBaseFactor: 1e-6, displaySymbol: 'mg', name: 'milligrams' },
  'milligrams': { canonical: 'mg', dimension: 'mass', toBaseFactor: 1e-6, displaySymbol: 'mg', name: 'milligrams' },

  'μg': { canonical: 'μg', dimension: 'mass', toBaseFactor: 1e-9, displaySymbol: 'μg', name: 'micrograms' },
  'ug': { canonical: 'μg', dimension: 'mass', toBaseFactor: 1e-9, displaySymbol: 'μg', name: 'micrograms' },

  't': { canonical: 't', dimension: 'mass', toBaseFactor: 1000, displaySymbol: 't', name: 'tonnes' },
  'tonne': { canonical: 't', dimension: 'mass', toBaseFactor: 1000, displaySymbol: 't', name: 'tonnes' },
  'tonnes': { canonical: 't', dimension: 'mass', toBaseFactor: 1000, displaySymbol: 't', name: 'tonnes' },

  'lb': { canonical: 'lb', dimension: 'mass', toBaseFactor: 0.45359237, displaySymbol: 'lb', name: 'pounds' },
  'lbs': { canonical: 'lb', dimension: 'mass', toBaseFactor: 0.45359237, displaySymbol: 'lb', name: 'pounds' },
  'pound': { canonical: 'lb', dimension: 'mass', toBaseFactor: 0.45359237, displaySymbol: 'lb', name: 'pounds' },
  'pounds': { canonical: 'lb', dimension: 'mass', toBaseFactor: 0.45359237, displaySymbol: 'lb', name: 'pounds' },

  'oz': { canonical: 'oz', dimension: 'mass', toBaseFactor: 0.028349523, displaySymbol: 'oz', name: 'ounces' },
  'ounce': { canonical: 'oz', dimension: 'mass', toBaseFactor: 0.028349523, displaySymbol: 'oz', name: 'ounces' },
  'ounces': { canonical: 'oz', dimension: 'mass', toBaseFactor: 0.028349523, displaySymbol: 'oz', name: 'ounces' },

  // === TIME (Base: second 's') ===
  's': { canonical: 's', dimension: 'time', toBaseFactor: 1, displaySymbol: 's', name: 'seconds' },
  'sec': { canonical: 's', dimension: 'time', toBaseFactor: 1, displaySymbol: 's', name: 'seconds' },
  'secs': { canonical: 's', dimension: 'time', toBaseFactor: 1, displaySymbol: 's', name: 'seconds' },
  'second': { canonical: 's', dimension: 'time', toBaseFactor: 1, displaySymbol: 's', name: 'seconds' },
  'seconds': { canonical: 's', dimension: 'time', toBaseFactor: 1, displaySymbol: 's', name: 'seconds' },

  'ms': { canonical: 'ms', dimension: 'time', toBaseFactor: 0.001, displaySymbol: 'ms', name: 'milliseconds' },
  'millisecond': { canonical: 'ms', dimension: 'time', toBaseFactor: 0.001, displaySymbol: 'ms', name: 'milliseconds' },
  'milliseconds': { canonical: 'ms', dimension: 'time', toBaseFactor: 0.001, displaySymbol: 'ms', name: 'milliseconds' },

  'μs': { canonical: 'μs', dimension: 'time', toBaseFactor: 1e-6, displaySymbol: 'μs', name: 'microseconds' },
  'us': { canonical: 'μs', dimension: 'time', toBaseFactor: 1e-6, displaySymbol: 'μs', name: 'microseconds' },

  'min': { canonical: 'min', dimension: 'time', toBaseFactor: 60, displaySymbol: 'min', name: 'minutes' },
  'mins': { canonical: 'min', dimension: 'time', toBaseFactor: 60, displaySymbol: 'min', name: 'minutes' },
  'minute': { canonical: 'min', dimension: 'time', toBaseFactor: 60, displaySymbol: 'min', name: 'minutes' },
  'minutes': { canonical: 'min', dimension: 'time', toBaseFactor: 60, displaySymbol: 'min', name: 'minutes' },

  'h': { canonical: 'h', dimension: 'time', toBaseFactor: 3600, displaySymbol: 'h', name: 'hours' },
  'hr': { canonical: 'h', dimension: 'time', toBaseFactor: 3600, displaySymbol: 'h', name: 'hours' },
  'hrs': { canonical: 'h', dimension: 'time', toBaseFactor: 3600, displaySymbol: 'h', name: 'hours' },
  'hour': { canonical: 'h', dimension: 'time', toBaseFactor: 3600, displaySymbol: 'h', name: 'hours' },
  'hours': { canonical: 'h', dimension: 'time', toBaseFactor: 3600, displaySymbol: 'h', name: 'hours' },

  'd': { canonical: 'd', dimension: 'time', toBaseFactor: 86400, displaySymbol: 'd', name: 'days' },
  'day': { canonical: 'd', dimension: 'time', toBaseFactor: 86400, displaySymbol: 'd', name: 'days' },
  'days': { canonical: 'd', dimension: 'time', toBaseFactor: 86400, displaySymbol: 'd', name: 'days' },

  // === SPEED & VELOCITY (Base: m/s) ===
  'm/s': { canonical: 'm/s', dimension: 'speed', toBaseFactor: 1, displaySymbol: 'm/s', name: 'meters per second' },
  'ms^-1': { canonical: 'm/s', dimension: 'speed', toBaseFactor: 1, displaySymbol: 'm/s', name: 'meters per second' },
  'ms-1': { canonical: 'm/s', dimension: 'speed', toBaseFactor: 1, displaySymbol: 'm/s', name: 'meters per second' },
  'm/sec': { canonical: 'm/s', dimension: 'speed', toBaseFactor: 1, displaySymbol: 'm/s', name: 'meters per second' },

  'km/h': { canonical: 'km/h', dimension: 'speed', toBaseFactor: 1 / 3.6, displaySymbol: 'km/h', name: 'kilometers per hour' },
  'km/hr': { canonical: 'km/h', dimension: 'speed', toBaseFactor: 1 / 3.6, displaySymbol: 'km/h', name: 'kilometers per hour' },
  'kmph': { canonical: 'km/h', dimension: 'speed', toBaseFactor: 1 / 3.6, displaySymbol: 'km/h', name: 'kilometers per hour' },
  'kph': { canonical: 'km/h', dimension: 'speed', toBaseFactor: 1 / 3.6, displaySymbol: 'km/h', name: 'kilometers per hour' },

  'mph': { canonical: 'mph', dimension: 'speed', toBaseFactor: 0.44704, displaySymbol: 'mph', name: 'miles per hour' },
  'mi/h': { canonical: 'mph', dimension: 'speed', toBaseFactor: 0.44704, displaySymbol: 'mph', name: 'miles per hour' },
  'mi/hr': { canonical: 'mph', dimension: 'speed', toBaseFactor: 0.44704, displaySymbol: 'mph', name: 'miles per hour' },

  'kn': { canonical: 'kn', dimension: 'speed', toBaseFactor: 0.514444, displaySymbol: 'kn', name: 'knots' },
  'knot': { canonical: 'kn', dimension: 'speed', toBaseFactor: 0.514444, displaySymbol: 'kn', name: 'knots' },
  'knots': { canonical: 'kn', dimension: 'speed', toBaseFactor: 0.514444, displaySymbol: 'kn', name: 'knots' },

  // === ACCELERATION (Base: m/s²) ===
  'm/s²': { canonical: 'm/s²', dimension: 'acceleration', toBaseFactor: 1, displaySymbol: 'm/s²', name: 'meters per second squared' },
  'm/s^2': { canonical: 'm/s²', dimension: 'acceleration', toBaseFactor: 1, displaySymbol: 'm/s²', name: 'meters per second squared' },
  'm/s2': { canonical: 'm/s²', dimension: 'acceleration', toBaseFactor: 1, displaySymbol: 'm/s²', name: 'meters per second squared' },
  'ms^-2': { canonical: 'm/s²', dimension: 'acceleration', toBaseFactor: 1, displaySymbol: 'm/s²', name: 'meters per second squared' },
  'ms-2': { canonical: 'm/s²', dimension: 'acceleration', toBaseFactor: 1, displaySymbol: 'm/s²', name: 'meters per second squared' },
  'cm/s²': { canonical: 'cm/s²', dimension: 'acceleration', toBaseFactor: 0.01, displaySymbol: 'cm/s²', name: 'centimeters per second squared' },
  'g_force': { canonical: 'g_force', dimension: 'acceleration', toBaseFactor: 9.80665, displaySymbol: 'g', name: 'standard gravity' },

  // === FORCE (Base: newton 'N') ===
  'n': { canonical: 'n', dimension: 'force', toBaseFactor: 1, displaySymbol: 'N', name: 'newtons' },
  'newton': { canonical: 'n', dimension: 'force', toBaseFactor: 1, displaySymbol: 'N', name: 'newtons' },
  'newtons': { canonical: 'n', dimension: 'force', toBaseFactor: 1, displaySymbol: 'N', name: 'newtons' },

  'kn_force': { canonical: 'kn_force', dimension: 'force', toBaseFactor: 1000, displaySymbol: 'kN', name: 'kilonewtons' },
  'kilonewton': { canonical: 'kn_force', dimension: 'force', toBaseFactor: 1000, displaySymbol: 'kN', name: 'kilonewtons' },
  'kilonewtons': { canonical: 'kn_force', dimension: 'force', toBaseFactor: 1000, displaySymbol: 'kN', name: 'kilonewtons' },

  'mn_force': { canonical: 'mn_force', dimension: 'force', toBaseFactor: 1e6, displaySymbol: 'MN', name: 'meganewtons' },
  'dyn': { canonical: 'dyn', dimension: 'force', toBaseFactor: 1e-5, displaySymbol: 'dyn', name: 'dynes' },
  'dyne': { canonical: 'dyn', dimension: 'force', toBaseFactor: 1e-5, displaySymbol: 'dyn', name: 'dynes' },
  'lbf': { canonical: 'lbf', dimension: 'force', toBaseFactor: 4.448222, displaySymbol: 'lbf', name: 'pound-force' },

  // === ENERGY & WORK (Base: joule 'J') ===
  'j': { canonical: 'j', dimension: 'energy', toBaseFactor: 1, displaySymbol: 'J', name: 'joules' },
  'joule': { canonical: 'j', dimension: 'energy', toBaseFactor: 1, displaySymbol: 'J', name: 'joules' },
  'joules': { canonical: 'j', dimension: 'energy', toBaseFactor: 1, displaySymbol: 'J', name: 'joules' },

  'kj': { canonical: 'kj', dimension: 'energy', toBaseFactor: 1000, displaySymbol: 'kJ', name: 'kilojoules' },
  'kilojoule': { canonical: 'kj', dimension: 'energy', toBaseFactor: 1000, displaySymbol: 'kJ', name: 'kilojoules' },
  'kilojoules': { canonical: 'kj', dimension: 'energy', toBaseFactor: 1000, displaySymbol: 'kJ', name: 'kilojoules' },

  'mj': { canonical: 'mj', dimension: 'energy', toBaseFactor: 1e6, displaySymbol: 'MJ', name: 'megajoules' },
  'megajoule': { canonical: 'mj', dimension: 'energy', toBaseFactor: 1e6, displaySymbol: 'MJ', name: 'megajoules' },

  'cal': { canonical: 'cal', dimension: 'energy', toBaseFactor: 4.184, displaySymbol: 'cal', name: 'calories' },
  'calorie': { canonical: 'cal', dimension: 'energy', toBaseFactor: 4.184, displaySymbol: 'cal', name: 'calories' },
  'calories': { canonical: 'cal', dimension: 'energy', toBaseFactor: 4.184, displaySymbol: 'cal', name: 'calories' },

  'kcal': { canonical: 'kcal', dimension: 'energy', toBaseFactor: 4184, displaySymbol: 'kcal', name: 'kilocalories' },
  'kilocalorie': { canonical: 'kcal', dimension: 'energy', toBaseFactor: 4184, displaySymbol: 'kcal', name: 'kilocalories' },
  'kilocalories': { canonical: 'kcal', dimension: 'energy', toBaseFactor: 4184, displaySymbol: 'kcal', name: 'kilocalories' },

  'ev': { canonical: 'ev', dimension: 'energy', toBaseFactor: 1.602176634e-19, displaySymbol: 'eV', name: 'electronvolts' },
  'electronvolt': { canonical: 'ev', dimension: 'energy', toBaseFactor: 1.602176634e-19, displaySymbol: 'eV', name: 'electronvolts' },
  'mev': { canonical: 'mev', dimension: 'energy', toBaseFactor: 1.602176634e-13, displaySymbol: 'MeV', name: 'mega-electronvolts' },

  'kwh': { canonical: 'kwh', dimension: 'energy', toBaseFactor: 3.6e6, displaySymbol: 'kWh', name: 'kilowatt-hours' },
  'wh': { canonical: 'wh', dimension: 'energy', toBaseFactor: 3600, displaySymbol: 'Wh', name: 'watt-hours' },

  // === POWER (Base: watt 'W') ===
  'w': { canonical: 'w', dimension: 'power', toBaseFactor: 1, displaySymbol: 'W', name: 'watts' },
  'watt': { canonical: 'w', dimension: 'power', toBaseFactor: 1, displaySymbol: 'W', name: 'watts' },
  'watts': { canonical: 'w', dimension: 'power', toBaseFactor: 1, displaySymbol: 'W', name: 'watts' },

  'kw': { canonical: 'kw', dimension: 'power', toBaseFactor: 1000, displaySymbol: 'kW', name: 'kilowatts' },
  'kilowatt': { canonical: 'kw', dimension: 'power', toBaseFactor: 1000, displaySymbol: 'kW', name: 'kilowatts' },
  'kilowatts': { canonical: 'kw', dimension: 'power', toBaseFactor: 1000, displaySymbol: 'kW', name: 'kilowatts' },

  'mw_power': { canonical: 'mw_power', dimension: 'power', toBaseFactor: 1e6, displaySymbol: 'MW', name: 'megawatts' },
  'megawatt': { canonical: 'mw_power', dimension: 'power', toBaseFactor: 1e6, displaySymbol: 'MW', name: 'megawatts' },

  'milliw': { canonical: 'milliw', dimension: 'power', toBaseFactor: 0.001, displaySymbol: 'mW', name: 'milliwatts' },
  'milliwatt': { canonical: 'milliw', dimension: 'power', toBaseFactor: 0.001, displaySymbol: 'mW', name: 'milliwatts' },

  'hp': { canonical: 'hp', dimension: 'power', toBaseFactor: 745.699872, displaySymbol: 'hp', name: 'horsepower' },
  'horsepower': { canonical: 'hp', dimension: 'power', toBaseFactor: 745.699872, displaySymbol: 'hp', name: 'horsepower' },

  // === PRESSURE (Base: pascal 'Pa') ===
  'pa': { canonical: 'pa', dimension: 'pressure', toBaseFactor: 1, displaySymbol: 'Pa', name: 'pascals' },
  'pascal': { canonical: 'pa', dimension: 'pressure', toBaseFactor: 1, displaySymbol: 'Pa', name: 'pascals' },
  'pascals': { canonical: 'pa', dimension: 'pressure', toBaseFactor: 1, displaySymbol: 'Pa', name: 'pascals' },

  'kpa': { canonical: 'kpa', dimension: 'pressure', toBaseFactor: 1000, displaySymbol: 'kPa', name: 'kilopascals' },
  'kilopascal': { canonical: 'kpa', dimension: 'pressure', toBaseFactor: 1000, displaySymbol: 'kPa', name: 'kilopascals' },

  'mpa': { canonical: 'mpa', dimension: 'pressure', toBaseFactor: 1e6, displaySymbol: 'MPa', name: 'megapascals' },

  'bar': { canonical: 'bar', dimension: 'pressure', toBaseFactor: 100000, displaySymbol: 'bar', name: 'bars' },
  'bars': { canonical: 'bar', dimension: 'pressure', toBaseFactor: 100000, displaySymbol: 'bar', name: 'bars' },
  'mbar': { canonical: 'mbar', dimension: 'pressure', toBaseFactor: 100, displaySymbol: 'mbar', name: 'millibars' },

  'atm': { canonical: 'atm', dimension: 'pressure', toBaseFactor: 101325, displaySymbol: 'atm', name: 'atmospheres' },
  'atmosphere': { canonical: 'atm', dimension: 'pressure', toBaseFactor: 101325, displaySymbol: 'atm', name: 'atmospheres' },
  'atmospheres': { canonical: 'atm', dimension: 'pressure', toBaseFactor: 101325, displaySymbol: 'atm', name: 'atmospheres' },

  'psi': { canonical: 'psi', dimension: 'pressure', toBaseFactor: 6894.75729, displaySymbol: 'psi', name: 'pounds per square inch' },

  'mmhg': { canonical: 'mmhg', dimension: 'pressure', toBaseFactor: 133.322387415, displaySymbol: 'mmHg', name: 'millimeters of mercury' },
  'torr': { canonical: 'torr', dimension: 'pressure', toBaseFactor: 133.322368421, displaySymbol: 'Torr', name: 'torr' },

  // === VOLTAGE (Base: volt 'V') ===
  'v': { canonical: 'v', dimension: 'voltage', toBaseFactor: 1, displaySymbol: 'V', name: 'volts' },
  'volt': { canonical: 'v', dimension: 'voltage', toBaseFactor: 1, displaySymbol: 'V', name: 'volts' },
  'volts': { canonical: 'v', dimension: 'voltage', toBaseFactor: 1, displaySymbol: 'V', name: 'volts' },

  'mv': { canonical: 'mv', dimension: 'voltage', toBaseFactor: 0.001, displaySymbol: 'mV', name: 'millivolts' },
  'millivolt': { canonical: 'mv', dimension: 'voltage', toBaseFactor: 0.001, displaySymbol: 'mV', name: 'millivolts' },

  'kv': { canonical: 'kv', dimension: 'voltage', toBaseFactor: 1000, displaySymbol: 'kV', name: 'kilovolts' },
  'kilovolt': { canonical: 'kv', dimension: 'voltage', toBaseFactor: 1000, displaySymbol: 'kV', name: 'kilovolts' },

  // === CURRENT (Base: ampere 'A') ===
  'a': { canonical: 'a', dimension: 'current', toBaseFactor: 1, displaySymbol: 'A', name: 'amperes' },
  'amp': { canonical: 'a', dimension: 'current', toBaseFactor: 1, displaySymbol: 'A', name: 'amperes' },
  'amps': { canonical: 'a', dimension: 'current', toBaseFactor: 1, displaySymbol: 'A', name: 'amperes' },
  'ampere': { canonical: 'a', dimension: 'current', toBaseFactor: 1, displaySymbol: 'A', name: 'amperes' },
  'amperes': { canonical: 'a', dimension: 'current', toBaseFactor: 1, displaySymbol: 'A', name: 'amperes' },

  'ma': { canonical: 'ma', dimension: 'current', toBaseFactor: 0.001, displaySymbol: 'mA', name: 'milliamperes' },
  'milliamp': { canonical: 'ma', dimension: 'current', toBaseFactor: 0.001, displaySymbol: 'mA', name: 'milliamperes' },
  'milliamps': { canonical: 'ma', dimension: 'current', toBaseFactor: 0.001, displaySymbol: 'mA', name: 'milliamperes' },

  'μa': { canonical: 'μa', dimension: 'current', toBaseFactor: 1e-6, displaySymbol: 'μA', name: 'microamperes' },
  'ua': { canonical: 'μa', dimension: 'current', toBaseFactor: 1e-6, displaySymbol: 'μA', name: 'microamperes' },

  // === RESISTANCE (Base: ohm 'Ω') ===
  'ω': { canonical: 'ω', dimension: 'resistance', toBaseFactor: 1, displaySymbol: 'Ω', name: 'ohms' },
  'ohm': { canonical: 'ω', dimension: 'resistance', toBaseFactor: 1, displaySymbol: 'Ω', name: 'ohms' },
  'ohms': { canonical: 'ω', dimension: 'resistance', toBaseFactor: 1, displaySymbol: 'Ω', name: 'ohms' },

  'kω': { canonical: 'kω', dimension: 'resistance', toBaseFactor: 1000, displaySymbol: 'kΩ', name: 'kilohms' },
  'kohm': { canonical: 'kω', dimension: 'resistance', toBaseFactor: 1000, displaySymbol: 'kΩ', name: 'kilohms' },
  'kohms': { canonical: 'kω', dimension: 'resistance', toBaseFactor: 1000, displaySymbol: 'kΩ', name: 'kilohms' },

  'mω': { canonical: 'mω', dimension: 'resistance', toBaseFactor: 1e6, displaySymbol: 'MΩ', name: 'megaohms' },
  'mohm': { canonical: 'mω', dimension: 'resistance', toBaseFactor: 1e6, displaySymbol: 'MΩ', name: 'megaohms' },

  // === CAPACITANCE (Base: farad 'F') ===
  'f': { canonical: 'f', dimension: 'capacitance', toBaseFactor: 1, displaySymbol: 'F', name: 'farads' },
  'farad': { canonical: 'f', dimension: 'capacitance', toBaseFactor: 1, displaySymbol: 'F', name: 'farads' },
  'farads': { canonical: 'f', dimension: 'capacitance', toBaseFactor: 1, displaySymbol: 'F', name: 'farads' },

  'mf': { canonical: 'mf', dimension: 'capacitance', toBaseFactor: 0.001, displaySymbol: 'mF', name: 'millifarads' },
  'μf': { canonical: 'μf', dimension: 'capacitance', toBaseFactor: 1e-6, displaySymbol: 'μF', name: 'microfarads' },
  'uf': { canonical: 'μf', dimension: 'capacitance', toBaseFactor: 1e-6, displaySymbol: 'μF', name: 'microfarads' },
  'nf': { canonical: 'nf', dimension: 'capacitance', toBaseFactor: 1e-9, displaySymbol: 'nF', name: 'nanofarads' },
  'pf': { canonical: 'pf', dimension: 'capacitance', toBaseFactor: 1e-12, displaySymbol: 'pF', name: 'picofarads' },

  // === CHARGE (Base: coulomb 'C') ===
  'c': { canonical: 'c', dimension: 'charge', toBaseFactor: 1, displaySymbol: 'C', name: 'coulombs' },
  'coulomb': { canonical: 'c', dimension: 'charge', toBaseFactor: 1, displaySymbol: 'C', name: 'coulombs' },
  'coulombs': { canonical: 'c', dimension: 'charge', toBaseFactor: 1, displaySymbol: 'C', name: 'coulombs' },
  'mc': { canonical: 'mc', dimension: 'charge', toBaseFactor: 0.001, displaySymbol: 'mC', name: 'millicoulombs' },
  'μc': { canonical: 'μc', dimension: 'charge', toBaseFactor: 1e-6, displaySymbol: 'μC', name: 'microcoulombs' },
  'uc': { canonical: 'μc', dimension: 'charge', toBaseFactor: 1e-6, displaySymbol: 'μC', name: 'microcoulombs' },

  // === FREQUENCY (Base: hertz 'Hz') ===
  'hz': { canonical: 'hz', dimension: 'frequency', toBaseFactor: 1, displaySymbol: 'Hz', name: 'hertz' },
  'hertz': { canonical: 'hz', dimension: 'frequency', toBaseFactor: 1, displaySymbol: 'Hz', name: 'hertz' },
  'khz': { canonical: 'khz', dimension: 'frequency', toBaseFactor: 1000, displaySymbol: 'kHz', name: 'kilohertz' },
  'mhz': { canonical: 'mhz', dimension: 'frequency', toBaseFactor: 1e6, displaySymbol: 'MHz', name: 'megahertz' },
  'ghz': { canonical: 'ghz', dimension: 'frequency', toBaseFactor: 1e9, displaySymbol: 'GHz', name: 'gigahertz' },

  // === ANGLE (Base: radian 'rad') ===
  'rad': { canonical: 'rad', dimension: 'angle', toBaseFactor: 1, displaySymbol: 'rad', name: 'radians' },
  'radian': { canonical: 'rad', dimension: 'angle', toBaseFactor: 1, displaySymbol: 'rad', name: 'radians' },
  'radians': { canonical: 'rad', dimension: 'angle', toBaseFactor: 1, displaySymbol: 'rad', name: 'radians' },

  'deg': { canonical: 'deg', dimension: 'angle', toBaseFactor: Math.PI / 180, displaySymbol: '°', name: 'degrees' },
  'degree': { canonical: 'deg', dimension: 'angle', toBaseFactor: Math.PI / 180, displaySymbol: '°', name: 'degrees' },
  'degrees': { canonical: 'deg', dimension: 'angle', toBaseFactor: Math.PI / 180, displaySymbol: '°', name: 'degrees' },
  '°': { canonical: 'deg', dimension: 'angle', toBaseFactor: Math.PI / 180, displaySymbol: '°', name: 'degrees' },

  // === TEMPERATURE (Base: kelvin 'K') ===
  'k': { canonical: 'k', dimension: 'temperature', toBaseFactor: 1, displaySymbol: 'K', name: 'kelvin' },
  'kelvin': { canonical: 'k', dimension: 'temperature', toBaseFactor: 1, displaySymbol: 'K', name: 'kelvin' },
  '°c': { canonical: '°c', dimension: 'temperature', toBaseFactor: 1, offset: 273.15, displaySymbol: '°C', name: 'celsius' },
  'celsius': { canonical: '°c', dimension: 'temperature', toBaseFactor: 1, offset: 273.15, displaySymbol: '°C', name: 'celsius' },
};

/**
 * Normalizes a unit string key for lookup in UNIT_REGISTRY
 */
export function normalizeUnitKey(rawUnit: string): string {
  if (!rawUnit) return '';
  let cleaned = rawUnit
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\^]/g, '') // e.g. m/s^2 -> m/s2
    .replace(/[–—−]/g, '-');

  // Handle common variations
  if (cleaned === 'm/s2' || cleaned === 'ms-2' || cleaned === 'ms^-2') return 'm/s²';
  if (cleaned === 'm/s' || cleaned === 'ms-1' || cleaned === 'ms^-1') return 'm/s';
  if (cleaned === 'kn' && (rawUnit.includes('N') || rawUnit.toLowerCase().includes('kilonewton'))) return 'kn_force';
  if (cleaned === 'mw' && (rawUnit.includes('W') || rawUnit.toLowerCase().includes('megawatt'))) return 'mw_power';

  return cleaned;
}

/**
 * Retrieves the UnitDefinition for a given unit string
 */
export function getUnitDefinition(rawUnit: string): UnitDefinition | null {
  if (!rawUnit) return null;
  const key = normalizeUnitKey(rawUnit);
  if (UNIT_REGISTRY[key]) return UNIT_REGISTRY[key];

  // Additional fallback check for symbols with special chars
  const fallback = rawUnit.toLowerCase().trim();
  if (UNIT_REGISTRY[fallback]) return UNIT_REGISTRY[fallback];

  return null;
}

/**
 * Checks if two units are dimensionally compatible (e.g. 'm' and 'km', or 'km/h' and 'm/s')
 */
export function areUnitsDimensionallyCompatible(unitA: string, unitB: string): boolean {
  if (!unitA || !unitB) return false;
  const defA = getUnitDefinition(unitA);
  const defB = getUnitDefinition(unitB);
  if (!defA || !defB) return false;
  return defA.dimension === defB.dimension;
}

/**
 * Converts a numerical magnitude from one unit to its dimension's base SI unit
 */
export function convertToBaseSI(value: number, unit: string): { baseValue: number; dimension: DimensionCategory } | null {
  const def = getUnitDefinition(unit);
  if (!def) return null;

  if (def.dimension === 'temperature') {
    const baseValue = (value + (def.offset || 0)) * def.toBaseFactor;
    return { baseValue, dimension: def.dimension };
  }

  const baseValue = value * def.toBaseFactor;
  return { baseValue, dimension: def.dimension };
}

/**
 * Converts a value from one unit to another compatible unit
 */
export function convertUnitValue(value: number, fromUnit: string, toUnit: string): number | null {
  const defFrom = getUnitDefinition(fromUnit);
  const defTo = getUnitDefinition(toUnit);
  if (!defFrom || !defTo || defFrom.dimension !== defTo.dimension) return null;

  const baseResult = convertToBaseSI(value, fromUnit);
  if (!baseResult) return null;

  if (defTo.dimension === 'temperature') {
    return baseResult.baseValue / defTo.toBaseFactor - (defTo.offset || 0);
  }

  return baseResult.baseValue / defTo.toBaseFactor;
}

export interface UnitConversionCheckResult {
  isEquivalent: boolean;
  isDimensionallyCompatible: boolean;
  studentBaseValue: number | null;
  expectedBaseValue: number | null;
  studentSymbol: string;
  expectedSymbol: string;
  relativeDiff: number;
  conversionEquation: string;
}

/**
 * Formats a clean, readable representation of numbers (e.g. 1000 -> 1,000, 0.005 -> 5e-3 if small)
 */
export function formatFriendlyMagnitude(num: number): string {
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.001 && num !== 0)) {
    // Check if nicely rounded in scientific
    const sci = num.toExponential(3).replace(/\+0+/, '').replace(/\-0+/, '-');
    return parseFloat(num.toPrecision(4)).toString();
  }
  // Trim trailing decimal zeroes
  const rounded = parseFloat(num.toFixed(4));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/**
 * Checks whether a student's magnitude and unit are mathematically equivalent to the expected answer
 * using dimensional unit conversion (e.g., 1000m == 1km, 36 km/h == 10 m/s, 1.5 kW == 1500 W).
 */
export function checkUnitConvertedEquivalence(
  studentMag: number,
  studentUnitStr: string,
  expectedMag: number,
  expectedUnitStr: string,
  tolerancePercent: number = 0.5 // 0.5% adaptive floating point margin
): UnitConversionCheckResult {
  const defStudent = getUnitDefinition(studentUnitStr);
  const defExpected = getUnitDefinition(expectedUnitStr);

  if (!defStudent || !defExpected || defStudent.dimension !== defExpected.dimension) {
    return {
      isEquivalent: false,
      isDimensionallyCompatible: false,
      studentBaseValue: null,
      expectedBaseValue: null,
      studentSymbol: studentUnitStr,
      expectedSymbol: expectedUnitStr,
      relativeDiff: 1,
      conversionEquation: '',
    };
  }

  const studentBase = convertToBaseSI(studentMag, studentUnitStr);
  const expectedBase = convertToBaseSI(expectedMag, expectedUnitStr);

  if (!studentBase || !expectedBase) {
    return {
      isEquivalent: false,
      isDimensionallyCompatible: true,
      studentBaseValue: null,
      expectedBaseValue: null,
      studentSymbol: defStudent.displaySymbol,
      expectedSymbol: defExpected.displaySymbol,
      relativeDiff: 1,
      conversionEquation: '',
    };
  }

  const baseDiff = Math.abs(studentBase.baseValue - expectedBase.baseValue);
  const baseScale = Math.max(Math.abs(expectedBase.baseValue), 1e-10);
  const relativeDiff = baseDiff / baseScale;

  // Adaptive tolerance allows up to tolerancePercent (0.5%) for rounding and unit conversions
  const isEquivalent = relativeDiff <= (tolerancePercent / 100) || baseDiff <= 1e-5;

  // Format clean conversion equation, e.g. "1 km = 1,000 m" or "1000 m = 1 km"
  const sStr = `${formatFriendlyMagnitude(studentMag)} ${defStudent.displaySymbol}`;
  const eStr = `${formatFriendlyMagnitude(expectedMag)} ${defExpected.displaySymbol}`;
  const conversionEquation = `${sStr} = ${eStr}`;

  return {
    isEquivalent,
    isDimensionallyCompatible: true,
    studentBaseValue: studentBase.baseValue,
    expectedBaseValue: expectedBase.baseValue,
    studentSymbol: defStudent.displaySymbol,
    expectedSymbol: defExpected.displaySymbol,
    relativeDiff,
    conversionEquation,
  };
}

export interface ConversionReferenceItem {
  fromSymbol: string;
  toSymbol: string;
  factorText: string;
  formula: string;
  example: string;
}

export interface DimensionalReferenceCategory {
  id: DimensionCategory;
  title: string;
  description: string;
  baseSI: string;
  iconName: string;
  commonUnits: string[];
  conversions: ConversionReferenceItem[];
}

export const DIMENSIONAL_REFERENCE_CATEGORIES: DimensionalReferenceCategory[] = [
  {
    id: 'length',
    title: 'Length & Distance',
    description: 'Measures one-dimensional spatial extent between points.',
    baseSI: 'meter (m)',
    iconName: 'Ruler',
    commonUnits: ['km', 'm', 'cm', 'mm', 'μm', 'nm', 'in', 'ft', 'mi'],
    conversions: [
      { fromSymbol: '1 km', toSymbol: '1,000 m', factorText: '× 10³', formula: '1 km = 1,000 m', example: '5 km = 5,000 m' },
      { fromSymbol: '1 m', toSymbol: '100 cm', factorText: '× 10²', formula: '1 m = 100 cm = 1,000 mm', example: '2.5 m = 250 cm' },
      { fromSymbol: '1 cm', toSymbol: '10 mm', factorText: '× 10¹', formula: '1 cm = 0.01 m', example: '15 cm = 150 mm' },
      { fromSymbol: '1 mm', toSymbol: '1,000 μm', factorText: '× 10³', formula: '1 mm = 10⁻³ m', example: '0.5 mm = 500 μm' },
      { fromSymbol: '1 in', toSymbol: '2.54 cm', factorText: '× 0.0254', formula: '1 in = 0.0254 m', example: '10 in = 25.4 cm' },
      { fromSymbol: '1 ft', toSymbol: '0.3048 m', factorText: '× 0.3048', formula: '1 ft = 12 in = 30.48 cm', example: '6 ft = 1.8288 m' },
      { fromSymbol: '1 mi', toSymbol: '1,609.34 m', factorText: '× 1,609.344', formula: '1 mi = 1.60934 km', example: '2 mi = 3.2187 km' },
    ],
  },
  {
    id: 'mass',
    title: 'Mass & Quantity',
    description: 'Fundamental property representing the amount of matter in an object.',
    baseSI: 'kilogram (kg)',
    iconName: 'Weight',
    commonUnits: ['kg', 'g', 'mg', 'μg', 't', 'lb', 'oz'],
    conversions: [
      { fromSymbol: '1 t (tonne)', toSymbol: '1,000 kg', factorText: '× 10³', formula: '1 tonne = 1,000 kg', example: '2.5 t = 2,500 kg' },
      { fromSymbol: '1 kg', toSymbol: '1,000 g', factorText: '× 10³', formula: '1 kg = 1,000 g', example: '3.5 kg = 3,500 g' },
      { fromSymbol: '1 g', toSymbol: '1,000 mg', factorText: '× 10³', formula: '1 g = 10⁻³ kg', example: '250 mg = 0.25 g' },
      { fromSymbol: '1 mg', toSymbol: '1,000 μg', factorText: '× 10³', formula: '1 mg = 10⁻⁶ kg', example: '100 μg = 0.1 mg' },
      { fromSymbol: '1 lb', toSymbol: '0.45359 kg', factorText: '× 0.4536', formula: '1 lb = 453.59 g', example: '10 lb = 4.536 kg' },
      { fromSymbol: '1 oz', toSymbol: '28.35 g', factorText: '× 0.02835', formula: '1 oz = 28.3495 g', example: '16 oz = 1 lb' },
    ],
  },
  {
    id: 'time',
    title: 'Time Duration',
    description: 'Continuous progression of existence and events.',
    baseSI: 'second (s)',
    iconName: 'Clock',
    commonUnits: ['d', 'h', 'min', 's', 'ms', 'μs'],
    conversions: [
      { fromSymbol: '1 d (day)', toSymbol: '86,400 s', factorText: '24 h', formula: '1 day = 24 h = 1,440 min = 86,400 s', example: '0.5 day = 12 h' },
      { fromSymbol: '1 h (hour)', toSymbol: '3,600 s', factorText: '60 min', formula: '1 h = 60 min = 3,600 s', example: '0.5 h = 30 min' },
      { fromSymbol: '1 min', toSymbol: '60 s', factorText: '× 60', formula: '1 min = 60 s', example: '2.5 min = 150 s' },
      { fromSymbol: '1 s', toSymbol: '1,000 ms', factorText: '× 10³', formula: '1 s = 1,000 ms', example: '50 ms = 0.05 s' },
      { fromSymbol: '1 ms', toSymbol: '1,000 μs', factorText: '× 10³', formula: '1 ms = 10⁻³ s', example: '250 μs = 0.25 ms' },
    ],
  },
  {
    id: 'speed',
    title: 'Speed & Velocity',
    description: 'Rate of change of position with respect to time.',
    baseSI: 'meter per second (m/s)',
    iconName: 'Gauge',
    commonUnits: ['m/s', 'km/h', 'mph', 'kn'],
    conversions: [
      { fromSymbol: '1 km/h', toSymbol: '0.2778 m/s', factorText: '÷ 3.6', formula: '1 m/s = 3.6 km/h', example: '36 km/h = 10 m/s' },
      { fromSymbol: '1 m/s', toSymbol: '3.6 km/h', factorText: '× 3.6', formula: 'v(km/h) = v(m/s) × 3.6', example: '20 m/s = 72 km/h' },
      { fromSymbol: '1 mph', toSymbol: '0.44704 m/s', factorText: '× 0.447', formula: '1 mph = 1.60934 km/h', example: '60 mph = 26.82 m/s' },
      { fromSymbol: '1 knot', toSymbol: '0.5144 m/s', factorText: '× 0.5144', formula: '1 knot = 1.852 km/h', example: '10 kn = 5.144 m/s' },
    ],
  },
  {
    id: 'acceleration',
    title: 'Acceleration',
    description: 'Rate of change of velocity per unit time.',
    baseSI: 'meter per second squared (m/s²)',
    iconName: 'Zap',
    commonUnits: ['m/s²', 'cm/s²', 'g'],
    conversions: [
      { fromSymbol: '1 g (standard gravity)', toSymbol: '9.80665 m/s²', factorText: '× 9.81', formula: '1 g = 9.80665 m/s²', example: '2 g = 19.62 m/s²' },
      { fromSymbol: '1 m/s²', toSymbol: '100 cm/s²', factorText: '× 100', formula: '1 m/s² = 100 cm/s²', example: '9.8 m/s² = 980 cm/s²' },
    ],
  },
  {
    id: 'force',
    title: 'Force & Weight',
    description: 'Push or pull resulting from an interaction ($F = m \\cdot a$).',
    baseSI: 'newton (N)',
    iconName: 'Activity',
    commonUnits: ['MN', 'kN', 'N', 'dyn', 'lbf'],
    conversions: [
      { fromSymbol: '1 kN', toSymbol: '1,000 N', factorText: '× 10³', formula: '1 kN = 1,000 N', example: '4.5 kN = 4,500 N' },
      { fromSymbol: '1 MN', toSymbol: '10⁶ N', factorText: '× 10⁶', formula: '1 MN = 1,000,000 N', example: '0.2 MN = 200 kN' },
      { fromSymbol: '1 N', toSymbol: '10⁵ dyn', factorText: '× 10⁵', formula: '1 N = 100,000 dyn', example: '10 N = 10⁶ dyn' },
      { fromSymbol: '1 lbf', toSymbol: '4.4482 N', factorText: '× 4.448', formula: '1 lbf = 4.44822 N', example: '100 lbf = 444.82 N' },
    ],
  },
  {
    id: 'energy',
    title: 'Energy & Work',
    description: 'Quantitative property transferred to perform work ($W = F \\cdot d$).',
    baseSI: 'joule (J)',
    iconName: 'Flame',
    commonUnits: ['MJ', 'kJ', 'J', 'cal', 'kcal', 'kWh', 'eV'],
    conversions: [
      { fromSymbol: '1 kJ', toSymbol: '1,000 J', factorText: '× 10³', formula: '1 kJ = 1,000 J', example: '3.6 kJ = 3,600 J' },
      { fromSymbol: '1 MJ', toSymbol: '10⁶ J', factorText: '× 10⁶', formula: '1 MJ = 1,000,000 J', example: '2 MJ = 2,000 kJ' },
      { fromSymbol: '1 cal', toSymbol: '4.184 J', factorText: '× 4.184', formula: '1 cal = 4.184 J', example: '100 cal = 418.4 J' },
      { fromSymbol: '1 kcal', toSymbol: '4,184 J', factorText: '× 4.184 kJ', formula: '1 kcal = 4.184 kJ = 1,000 cal', example: '200 kcal = 836.8 kJ' },
      { fromSymbol: '1 kWh', toSymbol: '3.6 × 10⁶ J', factorText: '× 3.6 MJ', formula: '1 kWh = 3,600,000 J = 3.6 MJ', example: '1.5 kWh = 5.4 MJ' },
      { fromSymbol: '1 eV', toSymbol: '1.602 × 10⁻¹⁹ J', factorText: '× 1.602e-19', formula: '1 eV = 1.60218 × 10⁻¹⁹ J', example: '13.6 eV = 2.18 × 10⁻¹⁸ J' },
    ],
  },
  {
    id: 'power',
    title: 'Power & Output',
    description: 'Rate of doing work or transferring energy ($P = E / t$).',
    baseSI: 'watt (W)',
    iconName: 'Cpu',
    commonUnits: ['MW', 'kW', 'W', 'mW', 'hp'],
    conversions: [
      { fromSymbol: '1 kW', toSymbol: '1,000 W', factorText: '× 10³', formula: '1 kW = 1,000 W = 1,000 J/s', example: '1.5 kW = 1,500 W' },
      { fromSymbol: '1 MW', toSymbol: '10⁶ W', factorText: '× 10⁶', formula: '1 MW = 1,000 kW', example: '0.8 MW = 800 kW' },
      { fromSymbol: '1 hp', toSymbol: '745.7 W', factorText: '× 745.7', formula: '1 hp = 745.699872 W', example: '2 hp = 1.491 kW' },
      { fromSymbol: '1 W', toSymbol: '1,000 mW', factorText: '× 10³', formula: '1 W = 10³ mW', example: '500 mW = 0.5 W' },
    ],
  },
  {
    id: 'pressure',
    title: 'Pressure & Stress',
    description: 'Force applied perpendicular to the surface of an object per unit area ($P = F / A$).',
    baseSI: 'pascal (Pa)',
    iconName: 'Layers',
    commonUnits: ['MPa', 'kPa', 'Pa', 'bar', 'atm', 'psi', 'mmHg', 'Torr'],
    conversions: [
      { fromSymbol: '1 kPa', toSymbol: '1,000 Pa', factorText: '× 10³', formula: '1 kPa = 1,000 N/m²', example: '101.3 kPa = 101,300 Pa' },
      { fromSymbol: '1 MPa', toSymbol: '10⁶ Pa', factorText: '× 10⁶', formula: '1 MPa = 10⁶ N/m²', example: '2.5 MPa = 2,500 kPa' },
      { fromSymbol: '1 bar', toSymbol: '100,000 Pa', factorText: '× 10⁵', formula: '1 bar = 100 kPa = 0.1 MPa', example: '2.5 bar = 250 kPa' },
      { fromSymbol: '1 atm', toSymbol: '101,325 Pa', factorText: '101.325 kPa', formula: '1 atm = 101,325 Pa = 1.01325 bar', example: '1 atm = 760 mmHg' },
      { fromSymbol: '1 psi', toSymbol: '6,894.76 Pa', factorText: '× 6.895 kPa', formula: '1 psi = 6.89476 kPa', example: '14.7 psi ≈ 1 atm' },
      { fromSymbol: '1 mmHg / Torr', toSymbol: '133.32 Pa', factorText: '× 133.32', formula: '760 mmHg = 101,325 Pa', example: '760 mmHg = 1 atm' },
    ],
  },
  {
    id: 'voltage',
    title: 'Voltage & Potential',
    description: 'Electric potential difference between two points.',
    baseSI: 'volt (V)',
    iconName: 'Zap',
    commonUnits: ['kV', 'V', 'mV'],
    conversions: [
      { fromSymbol: '1 kV', toSymbol: '1,000 V', factorText: '× 10³', formula: '1 kV = 1,000 V', example: '11 kV = 11,000 V' },
      { fromSymbol: '1 V', toSymbol: '1,000 mV', factorText: '× 10³', formula: '1 V = 1,000 mV', example: '0.05 V = 50 mV' },
    ],
  },
  {
    id: 'current',
    title: 'Electric Current',
    description: 'Rate of flow of electric charge past a point ($I = Q / t$).',
    baseSI: 'ampere (A)',
    iconName: 'Activity',
    commonUnits: ['A', 'mA', 'μA'],
    conversions: [
      { fromSymbol: '1 A', toSymbol: '1,000 mA', factorText: '× 10³', formula: '1 A = 1,000 mA = 1 C/s', example: '2.5 A = 2,500 mA' },
      { fromSymbol: '1 mA', toSymbol: '1,000 μA', factorText: '× 10³', formula: '1 mA = 10⁻³ A', example: '100 μA = 0.1 mA' },
    ],
  },
  {
    id: 'resistance',
    title: 'Electrical Resistance',
    description: 'Measure of opposition to electric current flow ($R = V / I$).',
    baseSI: 'ohm (Ω)',
    iconName: 'Cpu',
    commonUnits: ['MΩ', 'kΩ', 'Ω'],
    conversions: [
      { fromSymbol: '1 kΩ', toSymbol: '1,000 Ω', factorText: '× 10³', formula: '1 kΩ = 1,000 Ω', example: '4.7 kΩ = 4,700 Ω' },
      { fromSymbol: '1 MΩ', toSymbol: '10⁶ Ω', factorText: '× 10⁶', formula: '1 MΩ = 1,000 kΩ', example: '2.2 MΩ = 2,200 kΩ' },
    ],
  },
  {
    id: 'frequency',
    title: 'Frequency',
    description: 'Number of occurrences of a repeating event per unit of time ($f = 1 / T$).',
    baseSI: 'hertz (Hz)',
    iconName: 'Radio',
    commonUnits: ['GHz', 'MHz', 'kHz', 'Hz'],
    conversions: [
      { fromSymbol: '1 kHz', toSymbol: '1,000 Hz', factorText: '× 10³', formula: '1 kHz = 1,000 Hz', example: '20 kHz = 20,000 Hz' },
      { fromSymbol: '1 MHz', toSymbol: '10⁶ Hz', factorText: '× 10⁶', formula: '1 MHz = 1,000 kHz', example: '100 MHz = 10⁸ Hz' },
      { fromSymbol: '1 GHz', toSymbol: '10⁹ Hz', factorText: '× 10⁹', formula: '1 GHz = 1,000 MHz', example: '2.4 GHz = 2,400 MHz' },
    ],
  },
  {
    id: 'angle',
    title: 'Plane Angle',
    description: 'Figure formed by two rays sharing a common endpoint.',
    baseSI: 'radian (rad)',
    iconName: 'Compass',
    commonUnits: ['rad', 'deg', '°'],
    conversions: [
      { fromSymbol: 'π rad (3.14159 rad)', toSymbol: '180°', factorText: '× (180/π)', formula: '180° = π rad ≈ 3.14159 rad', example: 'π/2 rad = 90°' },
      { fromSymbol: '1 rad', toSymbol: '57.2958°', factorText: '× 57.296°', formula: 'θ(deg) = θ(rad) × (180/π)', example: '2 rad ≈ 114.59°' },
      { fromSymbol: '1°', toSymbol: '0.01745 rad', factorText: '× (π/180)', formula: 'θ(rad) = θ(deg) × (π/180)', example: '360° = 2π rad' },
    ],
  },
  {
    id: 'temperature',
    title: 'Temperature',
    description: 'Physical property of matter expressing hot and cold quantitatively.',
    baseSI: 'kelvin (K)',
    iconName: 'Thermometer',
    commonUnits: ['K', '°C'],
    conversions: [
      { fromSymbol: '0 °C', toSymbol: '273.15 K', factorText: '+ 273.15', formula: 'T(K) = T(°C) + 273.15', example: '25 °C = 298.15 K' },
      { fromSymbol: '100 °C (Boiling)', toSymbol: '373.15 K', factorText: '+ 273.15', formula: 'T(°C) = T(K) - 273.15', example: '300 K = 26.85 °C' },
    ],
  },
];

export interface UnitConversionLogEntry {
  applied: boolean;
  studentMagnitude: number;
  studentUnit: string;
  studentDisplay: string;
  expectedMagnitude: number;
  expectedUnit: string;
  expectedDisplay: string;
  dimension: DimensionCategory;
  dimensionTitle: string;
  scaleEquation: string;
  scaleFactorRatioText: string;
  baseEquivalenceText: string;
  categoryReference?: DimensionalReferenceCategory;
}

/**
 * Extracts a complete UnitConversionLogEntry from student/expected inputs
 */
export function generateConversionLogEntry(
  studentMag: number | null | undefined,
  studentUnitStr: string | null | undefined,
  expectedMag: number | null | undefined,
  expectedUnitStr: string | null | undefined
): UnitConversionLogEntry | null {
  if (
    studentMag === null ||
    studentMag === undefined ||
    !studentUnitStr ||
    expectedMag === null ||
    expectedMag === undefined ||
    !expectedUnitStr
  ) {
    return null;
  }

  const defStudent = getUnitDefinition(studentUnitStr);
  const defExpected = getUnitDefinition(expectedUnitStr);

  if (!defStudent || !defExpected || defStudent.dimension !== defExpected.dimension) {
    return null;
  }

  const check = checkUnitConvertedEquivalence(studentMag, studentUnitStr, expectedMag, expectedUnitStr);
  const category = DIMENSIONAL_REFERENCE_CATEGORIES.find((c) => c.id === defStudent.dimension);

  // Compute ratio
  const ratio = studentMag !== 0 ? expectedMag / studentMag : 1;
  let ratioText = '';
  if (Math.abs(ratio - 1) > 0.0001) {
    if (ratio >= 1000) {
      ratioText = `Scale multiplier: 10^${Math.round(Math.log10(ratio))}`;
    } else if (ratio <= 0.001) {
      ratioText = `Scale multiplier: 10^-${Math.round(-Math.log10(ratio))}`;
    } else {
      ratioText = `Scale ratio: ${parseFloat(ratio.toFixed(4))}×`;
    }
  } else {
    ratioText = '1:1 equivalent scale';
  }

  return {
    applied: check.isEquivalent,
    studentMagnitude: studentMag,
    studentUnit: defStudent.canonical,
    studentDisplay: `${formatFriendlyMagnitude(studentMag)} ${defStudent.displaySymbol}`,
    expectedMagnitude: expectedMag,
    expectedUnit: defExpected.canonical,
    expectedDisplay: `${formatFriendlyMagnitude(expectedMag)} ${defExpected.displaySymbol}`,
    dimension: defStudent.dimension,
    dimensionTitle: category?.title || defStudent.dimension,
    scaleEquation: check.conversionEquation || `${formatFriendlyMagnitude(studentMag)} ${defStudent.displaySymbol} = ${formatFriendlyMagnitude(expectedMag)} ${defExpected.displaySymbol}`,
    scaleFactorRatioText: ratioText,
    baseEquivalenceText: check.studentBaseValue !== null && check.expectedBaseValue !== null
      ? `Base SI representation: ${formatFriendlyMagnitude(check.studentBaseValue)} ${category?.baseSI || ''}`
      : '',
    categoryReference: category,
  };
}
