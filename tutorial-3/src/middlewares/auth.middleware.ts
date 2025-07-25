import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../error-handler/error-code';
import { ErrorException } from '../error-handler/error-exception';
import { verifyToken } from '../lib/auth.lib';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer')) {
    const token = auth.slice(7);

    try {
      const tokenData = verifyToken(token);
      req.body.tokenData = tokenData;
      next();
    } catch (error) {
      console.error('Error verifying token', error);
      throw new ErrorException(ErrorCode.Unauthenticated);
    }
  } else {
    throw new ErrorException(ErrorCode.Unauthenticated);
  }
};
