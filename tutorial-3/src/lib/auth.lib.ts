import { IUser } from '../models/user/user.db';
import jwt from 'jsonwebtoken';
import { ErrorException } from '../error-handler/error-exception';
import { ErrorCode } from '../error-handler/error-code';

const jwtKey = 'keyyyy';

export const generateAuthToken = (user: IUser): string => {
  const token = jwt.sign({ _id: user._id, email: user.email }, jwtKey, {
    expiresIn: '2h',
  });

  return token;
};

export const verifyToken = (token: string): { _id: string; email: string } => {
  try {
    const tokenData = jwt.verify(token, jwtKey);
    return tokenData as { _id: string; email: string };
  } catch (error) {
    console.error('Error verifying token', error);
    throw new ErrorException(ErrorCode.Unauthenticated);
  }
};
