import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToArabicNumerals(num: number): string {
  const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٤", "٥", "٢", "٩"]

  let result = num.toString()
  for (let i = 0; i < englishNumbers.length; i++) {
    result = result.replace(new RegExp(englishNumbers[i], "g"), arabicNumbers[i])
  }
  return result
}


