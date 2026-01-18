import {
  isDateString,
  isDefined,
  isNumberString,
  isString,
} from "class-validator";

export function transformToLowerCase(value: string) {
  if (isDefined(value) && isString(value)) {
    return value.toLowerCase();
  }
  return value;
}

export function trimTransform(value: string) {
  if (isDefined(value) && isString(value)) {
    return value.trim();
  }
  return value;
}

export function transformToNumber(value: string) {
  if (isDefined(value) && isNumberString(value)) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return number;
  }
  return value;
}

export function transformToDate(value: string, allowNull = true) {
  if (!value && allowNull) {
    return null;
  }
  if (isString(value) && !isDateString(value)) {
    return new Error(`Invalid format, expected ISO string: ${value}`);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Error(`Invalid date: ${value}`)
    : date;
}
