import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import { ErrorCode } from './error-handler/error-code';
import { ErrorException } from './error-handler/error-exception';
import { errorHandler } from './error-handler/error-handler';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Application works!');
});

app.get('/throw-unauthenticated', (req: Request, res: Response, next: NextFunction) => {
  throw new ErrorException(ErrorCode.Unauthenticated);
  // or
  // next(new ErrorException(ErrorCode.Unauthenticated))
});
app.get('/throw-maximum-allowed-grade', (req: Request, res: Response, next: NextFunction) => {
  throw new ErrorException(ErrorCode.MaximumAllowedGrade, { grade: Math.random() });
  // or
  // next(new ErrorException(ErrorCode.MaximumAllowedGrade, { grade: Math.random() }))
});
app.get('/throw-unknown-error', (req: Request, res: Response, next: NextFunction) => {
  const num: any = null;
  // Node.js will throw an error because there is no length property inside num variable
  console.log(num.length);
});

const someOtherFunction = () => {
  const myPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new ErrorException(ErrorCode.AsyncError));
    }, 1000);
  });
  return myPromise;
};
app.get('/throw-async-await-error', async (req: Request, res: Response, next: NextFunction) => {
  // express 4
  try {
    await someOtherFunction();
  } catch (err) {
    next(err);
    // next line will not work as expected
    // throw err
  }
  // express 5
  // await someOtherFunction();
});

app.use(errorHandler); // registration of handler

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
