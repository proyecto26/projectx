import { compare, genSalt, hash } from "bcrypt";

const SALT_ROUNDS = 10;

export const hashValue = async (value: string): Promise<string> => {
  const salt = await genSalt(SALT_ROUNDS);
  return hash(value, salt);
};

export const compareValue = async (
  value: string,
  hash: string,
): Promise<boolean> => {
  return compare(value, hash);
};
