/**
 * Real-time Mathematical & Scientific Validation Engine
 * Supports exact equality, numeric evaluation, fractions, scientific notation (1.5e-4, 1.5 * 10^-4),
 * automated dimensional unit conversions (e.g. 1000m == 1km, 36 km/h == 10 m/s, 1.5 kW == 1500 W),
 * metric & scientific units detection, root sets, sign convention detection, and error taxonomy diagnostics.
 */

import {
  checkUnitConvertedEquivalence,
  getUnitDefinition,
  areUnitsDimensionallyCompatible,
  formatFriendlyMagnitude,
} from './mathUnitConversion';

export type MathErrorType =
  | 'none'
  | 'exact'
  | 'equivalent'
  | 'sign'
  | 'unit'
  | 'precision'
  | 'intermediate_step'
  | 'incorrect'
  | 'empty';

export interface MathValidationResult {
  isMatch: boolean;
  isExact: boolean;
  isEquivalent: boolean;
  isUnitConverted?: boolean;
  conversionNote?: string | null;
  signError: boolean;
  unitError: boolean;
  isClose: boolean;
  confidence: number; // 0 - 100
  errorType: MathErrorType;
  badgeLabel: string;
  feedback: string;
  normalizedInput: string;
  normalizedExpected: string;
  unitExpected?: string | null;
  unitReceived?: string | null;
  expectedMagnitude?: number | null;
  receivedMagnitude?: number | null;
}

/**
 * Extracts attached physical unit and isolated numeric string from a raw input
 */
export function extractUnitAndMagnitude(raw: string): { magnitudeStr: string; unit: string | null } {
  if (!raw) return { magnitudeStr: '', unit: null };

  let trimmed = raw
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');

  // Strip leading variable assignments like "v = ", "ans = ", "x = ", "F = "
  trimmed = trimmed.replace(/^(x|y|z|v|u|f|d|a|s|r|h|p|q|i|w|e|ans|answer)\s*=\s*/i, '').trim();

  // Comprehensive regular expression matching standard units and compound units at the end
  const unitRegex = /\s*(m\/s²|m\/s\^2|m\/s2|m\/s|m\/sec|km\/h|km\/hr|kmph|kph|mph|mi\/h|kn|knot|knots|ms\^-1|ms\^-2|ms-1|ms-2|cm\/s²|g_force|kg|kilograms|kilogram|g|grams|gram|mg|milligrams|milligram|μg|ug|t|tonnes|tonne|lb|lbs|pound|pounds|oz|ounces|ounce|cm|centimeters|centimeter|mm|millimeters|millimeter|μm|um|micron|microns|nm|nanometers|nanometer|km|kilometers|kilometer|m|meters|meter|metres|metre|in|inch|inches|ft|feet|foot|yd|yards|yard|mi|miles|mile|sec|seconds|second|s|ms|milliseconds|millisecond|μs|us|microseconds|min|mins|minutes|minute|hrs|hr|hours|hour|h|d|days|day|newtons|newton|n|kn_force|kilonewtons|kilonewton|mn_force|dyn|dyne|lbf|joules|joule|j|kj|kilojoules|kilojoule|mj|megajoules|cal|calories|calorie|kcal|kilocalories|kilocalorie|ev|electronvolts|mev|kwh|wh|watts|watt|w|kw|kilowatts|kilowatt|mw_power|megawatts|megawatt|mw|milliw|milliwatts|milliwatt|hp|horsepower|volts|volt|v|mv|millivolts|kv|kilovolts|amperes|ampere|amps|amp|a|ma|milliamps|milliamp|μa|ua|coulombs|coulomb|c|mc|μc|uc|ohms|ohm|ω|kω|kohm|kohms|mω|mohm|farads|farad|f|mf|μf|uf|nf|pf|pascals|pascal|pa|kpa|kilopascals|mpa|bar|bars|mbar|atm|atmospheres|atmosphere|psi|mmhg|torr|hertz|hz|khz|kilohertz|mhz|megahertz|ghz|gigahertz|radians|radian|rad|degrees|degree|deg|°c|°|celsius|kelvin|k|mol|moles|mole|units)$/i;

  const match = trimmed.match(unitRegex);
  if (match) {
    const rawUnit = match[1].toLowerCase().replace(/\s/g, '');
    const def = getUnitDefinition(rawUnit);
    const canonical = def ? def.canonical : rawUnit;
    const mag = trimmed.slice(0, match.index).trim();
    return {
      magnitudeStr: mag,
      unit: canonical,
    };
  }

  return { magnitudeStr: trimmed, unit: null };
}

/**
 * Normalizes mathematical strings for robust comparison
 */
export function normalizeMathString(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    // Convert common unicode symbols to ascii/standard
    .replace(/[–—−]/g, '-')
    .replace(/[×*·]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/√\s*(\d+(?:\.\d+)?|\w+)/g, 'sqrt($1)')
    .replace(/\\pi|pi|π/g, 'pi')
    .replace(/\\theta|theta|θ/g, 'theta')
    .replace(/\\lambda|lambda|λ/g, 'lambda')
    // Remove common variable prefixes (e.g. "x =", "v =", "d =", "ans =")
    .replace(/^(x|y|z|v|u|f|d|a|s|r|h|p|q|i|w|e|ans|answer)\s*=\s*/i, '')
    // Remove extra whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely parses scientific notation, fraction, root, or float expression
 * Supports:
 * - "1.5e-4", "1.5E4"
 * - "1.5 * 10^-4", "1.5 x 10^-4", "1.5 × 10^3", "1.5 * 10^-(4)"
 * - "10^4", "10^-3"
 * - "3/4", "-1/2", "31/20"
 * - "sqrt(25)", "sqrt(4.5)"
 */
export function parseScientificOrNumericValue(str: string): number | null {
  if (!str) return null;
  const clean = normalizeMathString(str).replace(/\s/g, '');
  if (!clean) return null;

  // 1. Standard JS number or standard e-notation (e.g. "1.5", "-42", "1.5e-4", "2.3E8")
  const standardNum = Number(clean);
  if (!isNaN(standardNum) && !clean.includes('sqrt') && !clean.includes('pi') && !clean.includes('/')) {
    return standardNum;
  }

  // 2. Scientific notation variant: "1.5*10^-4", "1.5*10^4", "1.5*10^(-4)", "10^-4", "10^5"
  const sciMatch = clean.match(/^(-?\d+(?:\.\d+)?)?\*?10\^\(?(-?\d+(?:\.\d+)?)\)?$/);
  if (sciMatch) {
    const coeff = sciMatch[1] ? parseFloat(sciMatch[1]) : 1.0;
    const exponent = parseFloat(sciMatch[2]);
    if (!isNaN(coeff) && !isNaN(exponent)) {
      return coeff * Math.pow(10, exponent);
    }
  }

  // 3. Fraction format: "3/4", "-1/2", "15.5/2", "-(3/4)"
  const fracClean = clean.replace(/^\((.*)\)$/, '$1');
  const fractionMatch = fracClean.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numVal = parseFloat(fractionMatch[1]);
    const denVal = parseFloat(fractionMatch[2]);
    if (denVal !== 0) return numVal / denVal;
  }

  // 4. Square root format: "sqrt(25)", "sqrt(4.5)"
  const sqrtMatch = clean.match(/^sqrt\((\d+(?:\.\d+)?)\)$/);
  if (sqrtMatch) {
    const inner = parseFloat(sqrtMatch[1]);
    if (inner >= 0) return Math.sqrt(inner);
  }

  // 5. Product with Pi: e.g. "2*pi", "pi/2", "3*pi"
  if (clean === 'pi') return Math.PI;
  if (clean === '-pi') return -Math.PI;
  const piProductMatch = clean.match(/^(-?\d+(?:\.\d+)?)\*pi$/);
  if (piProductMatch) {
    return parseFloat(piProductMatch[1]) * Math.PI;
  }
  const piFractionMatch = clean.match(/^pi\/(\d+(?:\.\d+)?)$/);
  if (piFractionMatch) {
    const den = parseFloat(piFractionMatch[1]);
    if (den !== 0) return Math.PI / den;
  }

  return null;
}

/**
 * Legacy alias for backwards compatibility
 */
export const parseNumericValue = parseScientificOrNumericValue;

/**
 * Parses a comma or 'and'/'or' separated list of numbers/roots (e.g. "3, 1/2" or "1.5, 1")
 */
export function parseRootsSet(str: string): number[] | null {
  const parts = str
    .split(/[,;\s]+and\s+|[,;]+|\s+or\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return null;

  const numbers: number[] = [];
  for (const part of parts) {
    const val = parseScientificOrNumericValue(part);
    if (val === null) return null;
    numbers.push(val);
  }

  return numbers.sort((a, b) => a - b);
}

/**
 * Main Math Verification Engine
 * Validates student's answer against expected answer with units, scientific notation, sign conventions,
 * and automated unit conversions (e.g., 1000m accepted for 1km).
 */
export function validateMathAnswer(
  studentInput: string,
  expectedAnswer: string,
  acceptableAnswers: string[] = [],
  derivationSteps: Array<{ expression?: string; stepAction?: string }> = []
): MathValidationResult {
  const rawInput = studentInput ? studentInput.trim() : '';
  const expectedRaw = expectedAnswer ? expectedAnswer.trim() : '';

  if (!rawInput) {
    return {
      isMatch: false,
      isExact: false,
      isEquivalent: false,
      signError: false,
      unitError: false,
      isClose: false,
      confidence: 0,
      errorType: 'empty',
      badgeLabel: 'Type Calculation',
      feedback: 'Type or write your calculation value...',
      normalizedInput: '',
      normalizedExpected: normalizeMathString(expectedRaw),
    };
  }

  // Extract units from student input and benchmark
  const studentUnitExtract = extractUnitAndMagnitude(rawInput);
  const expectedUnitExtract = extractUnitAndMagnitude(expectedRaw);

  const studentUnit = studentUnitExtract.unit;
  const expectedUnit = expectedUnitExtract.unit;

  const inputNorm = normalizeMathString(studentUnitExtract.magnitudeStr || rawInput);
  const expectedNorm = normalizeMathString(expectedUnitExtract.magnitudeStr || expectedRaw);

  // 1. Direct normalized exact match (including unit check)
  const fullInputNorm = normalizeMathString(rawInput);
  const fullExpectedNorm = normalizeMathString(expectedRaw);

  if (fullInputNorm === fullExpectedNorm) {
    return {
      isMatch: true,
      isExact: true,
      isEquivalent: true,
      signError: false,
      unitError: false,
      isClose: false,
      confidence: 100,
      errorType: 'exact',
      badgeLabel: '✓ Correct (Exact Match)',
      feedback: 'Exact Match! Derivation aligns perfectly with expert calculation.',
      normalizedInput: fullInputNorm,
      normalizedExpected: fullExpectedNorm,
      unitExpected: expectedUnit,
      unitReceived: studentUnit,
    };
  }

  // 2. Check acceptable answers list
  const allAcceptable = [expectedAnswer, ...acceptableAnswers];
  for (const alt of allAcceptable) {
    const altNorm = normalizeMathString(alt);
    if (fullInputNorm === altNorm || inputNorm === altNorm) {
      return {
        isMatch: true,
        isExact: true,
        isEquivalent: true,
        signError: false,
        unitError: false,
        isClose: false,
        confidence: 100,
        errorType: 'exact',
        badgeLabel: '✓ Correct (Verified Form)',
        feedback: 'Correct! Equivalent algebraic notation verified.',
        normalizedInput: fullInputNorm,
        normalizedExpected: fullExpectedNorm,
        unitExpected: expectedUnit,
        unitReceived: studentUnit,
      };
    }
  }

  // 3. Numeric & Scientific Evaluation with Automated Unit Conversions
  const studentNum = parseScientificOrNumericValue(studentUnitExtract.magnitudeStr || rawInput);
  const expectedNum = parseScientificOrNumericValue(expectedUnitExtract.magnitudeStr || expectedRaw);

  if (studentNum !== null && expectedNum !== null) {
    // A. Check Dimensional Unit Conversion Equivalence (e.g. 1000 m == 1 km, 36 km/h == 10 m/s)
    if (studentUnit && expectedUnit && studentUnit !== expectedUnit) {
      const conversionCheck = checkUnitConvertedEquivalence(studentNum, studentUnit, expectedNum, expectedUnit);

      if (conversionCheck.isEquivalent) {
        const studentDef = getUnitDefinition(studentUnit);
        const expectedDef = getUnitDefinition(expectedUnit);
        const sSym = studentDef?.displaySymbol || studentUnit;
        const eSym = expectedDef?.displaySymbol || expectedUnit;
        const note = `${formatFriendlyMagnitude(studentNum)} ${sSym} = ${formatFriendlyMagnitude(expectedNum)} ${eSym} equivalent`;

        return {
          isMatch: true,
          isExact: false,
          isEquivalent: true,
          isUnitConverted: true,
          conversionNote: note,
          signError: false,
          unitError: false,
          isClose: false,
          confidence: 100,
          errorType: 'equivalent',
          badgeLabel: `✓ Correct (${note})`,
          feedback: `Unit Conversion Verified! Your answer (${formatFriendlyMagnitude(studentNum)} ${sSym}) is mathematically equivalent to ${formatFriendlyMagnitude(expectedNum)} ${eSym}.`,
          normalizedInput: fullInputNorm,
          normalizedExpected: fullExpectedNorm,
          unitExpected: expectedUnit,
          unitReceived: studentUnit,
          expectedMagnitude: expectedNum,
          receivedMagnitude: studentNum,
        };
      } else if (conversionCheck.isDimensionallyCompatible) {
        // Dimension is correct (e.g. both are length or power), but magnitude differs
        return {
          isMatch: false,
          isExact: false,
          isEquivalent: false,
          signError: false,
          unitError: true,
          isClose: false,
          confidence: 50,
          errorType: 'unit',
          badgeLabel: '⚠ Conversion / Value Error',
          feedback: `Unit dimension is compatible, but converted value (${formatFriendlyMagnitude(studentNum)} ${studentUnit}) does not equal expected ${expectedRaw}.`,
          normalizedInput: fullInputNorm,
          normalizedExpected: fullExpectedNorm,
          unitExpected: expectedUnit,
          unitReceived: studentUnit,
          expectedMagnitude: expectedNum,
          receivedMagnitude: studentNum,
        };
      }
    }

    // B. Direct Numeric Equality Comparison
    const diff = Math.abs(studentNum - expectedNum);
    const tolerance = Math.max(0.001, Math.abs(expectedNum) * 0.001);

    if (diff <= tolerance) {
      // Check for unit mismatch if expected answer requires a unit
      if (expectedUnit && studentUnit && expectedUnit !== studentUnit) {
        return {
          isMatch: false,
          isExact: false,
          isEquivalent: false,
          signError: false,
          unitError: true,
          isClose: false,
          confidence: 65,
          errorType: 'unit',
          badgeLabel: '⚠ Unit Mismatch',
          feedback: `Unit Mismatch: Value magnitude (${studentNum}) is correct, but unit received '${studentUnit}' does not match expected '${expectedUnit}'.`,
          normalizedInput: fullInputNorm,
          normalizedExpected: fullExpectedNorm,
          unitExpected: expectedUnit,
          unitReceived: studentUnit,
          expectedMagnitude: expectedNum,
          receivedMagnitude: studentNum,
        };
      }

      if (expectedUnit && !studentUnit) {
        // Magnitude is correct, but unit is missing
        return {
          isMatch: true, // Allow match with polite unit reminder
          isExact: false,
          isEquivalent: true,
          signError: false,
          unitError: true,
          isClose: false,
          confidence: 90,
          errorType: 'unit',
          badgeLabel: '✓ Value Correct (Add Unit)',
          feedback: `Correct Magnitude! Value ${studentNum} is right. Remember to append unit: '${expectedUnit}'.`,
          normalizedInput: fullInputNorm,
          normalizedExpected: fullExpectedNorm,
          unitExpected: expectedUnit,
          unitReceived: null,
          expectedMagnitude: expectedNum,
          receivedMagnitude: studentNum,
        };
      }

      return {
        isMatch: true,
        isExact: false,
        isEquivalent: true,
        signError: false,
        unitError: false,
        isClose: false,
        confidence: 100,
        errorType: 'equivalent',
        badgeLabel: '✓ Correct (Equivalent Value)',
        feedback: `Mathematically Equivalent! (${rawInput} = ${expectedRaw})`,
        normalizedInput: fullInputNorm,
        normalizedExpected: fullExpectedNorm,
        unitExpected: expectedUnit,
        unitReceived: studentUnit,
        expectedMagnitude: expectedNum,
        receivedMagnitude: studentNum,
      };
    }

    // Sign Error Detection (+ vs -)
    if (Math.abs(studentNum + expectedNum) <= tolerance && Math.abs(expectedNum) > 0.0001) {
      return {
        isMatch: false,
        isExact: false,
        isEquivalent: false,
        signError: true,
        unitError: false,
        isClose: false,
        confidence: 50,
        errorType: 'sign',
        badgeLabel: '⚠ Sign Error (+/-)',
        feedback: `Check Sign Convention: Magnitude is correct (${Math.abs(studentNum)}), but sign is reversed. Should it be ${expectedRaw}?`,
        normalizedInput: fullInputNorm,
        normalizedExpected: fullExpectedNorm,
        unitExpected: expectedUnit,
        unitReceived: studentUnit,
        expectedMagnitude: expectedNum,
        receivedMagnitude: studentNum,
      };
    }

    // Close Precision / Rounding Margin Check (within 5%)
    if (Math.abs(expectedNum) > 0 && diff / Math.abs(expectedNum) < 0.05) {
      return {
        isMatch: false,
        isExact: false,
        isEquivalent: false,
        signError: false,
        unitError: false,
        isClose: true,
        confidence: 70,
        errorType: 'precision',
        badgeLabel: '⚠ Precision / Rounding',
        feedback: `Very Close (${studentNum})! Check decimal precision or intermediate rounding steps.`,
        normalizedInput: fullInputNorm,
        normalizedExpected: fullExpectedNorm,
        unitExpected: expectedUnit,
        unitReceived: studentUnit,
        expectedMagnitude: expectedNum,
        receivedMagnitude: studentNum,
      };
    }
  }

  // 4. Compare as set of roots / multiple values (e.g. "3, 1/2" vs "1/2, 3")
  const studentRoots = parseRootsSet(rawInput);
  const expectedRoots = parseRootsSet(expectedRaw);

  if (studentRoots && expectedRoots && studentRoots.length === expectedRoots.length) {
    let allRootsMatch = true;
    for (let i = 0; i < studentRoots.length; i++) {
      if (Math.abs(studentRoots[i] - expectedRoots[i]) > 0.001) {
        allRootsMatch = false;
        break;
      }
    }
    if (allRootsMatch) {
      return {
        isMatch: true,
        isExact: false,
        isEquivalent: true,
        signError: false,
        unitError: false,
        isClose: false,
        confidence: 100,
        errorType: 'equivalent',
        badgeLabel: '✓ Correct Set of Roots',
        feedback: 'Correct Set of Roots! Permutation and values verified.',
        normalizedInput: fullInputNorm,
        normalizedExpected: fullExpectedNorm,
      };
    }
  }

  // 5. Check if input matches any intermediate step in derivation
  if (derivationSteps && derivationSteps.length > 0) {
    for (const step of derivationSteps) {
      if (step.expression) {
        const stepNorm = normalizeMathString(step.expression);
        if (stepNorm.includes(inputNorm) && inputNorm.length > 2) {
          return {
            isMatch: false,
            isExact: false,
            isEquivalent: false,
            signError: false,
            unitError: false,
            isClose: true,
            confidence: 60,
            errorType: 'intermediate_step',
            badgeLabel: 'ℹ Intermediate Step Detected',
            feedback: `Good intermediate step! Matches "${step.stepAction || 'Derivation'}". Now proceed to the final calculated answer.`,
            normalizedInput: fullInputNorm,
            normalizedExpected: fullExpectedNorm,
          };
        }
      }
    }
  }

  // Default: Incorrect / Retry
  return {
    isMatch: false,
    isExact: false,
    isEquivalent: false,
    signError: false,
    unitError: false,
    isClose: false,
    confidence: 10,
    errorType: 'incorrect',
    badgeLabel: '✖ Check Calculation',
    feedback: 'Not matching expected solution yet. Check calculation steps or review hint.',
    normalizedInput: fullInputNorm,
    normalizedExpected: fullExpectedNorm,
    unitExpected: expectedUnit,
    unitReceived: studentUnit,
  };
}
