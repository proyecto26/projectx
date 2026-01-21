import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const replaceNewLinesWithSpaces = (str: string) => {
  return str.replace(/\s{2,}/g, " ").trim();
};

export const classnames = (...inputs: ClassValue[]) => {
  return twMerge(replaceNewLinesWithSpaces(clsx(inputs)));
};
