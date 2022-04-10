import bcrypt from 'bcrypt';

export const passwordHash = (plainPassword: string): string => {
  const hash = bcrypt.hashSync(plainPassword, 10);
  return hash;
};

export const comparePassword = (plainPassword: string, passwordHash: string): boolean => {
  const compared = bcrypt.compareSync(plainPassword, passwordHash);
  return compared;
};
