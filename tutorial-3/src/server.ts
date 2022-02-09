import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import { ErrorCode } from './error-handler/error-code';
import { ErrorException } from './error-handler/error-exception';
import { errorHandler } from './error-handler/error-handler';
import { connect } from './models/db/mongoose-connection';
import { IUser, UserModel } from './models/db/user.db';
import { ulid } from 'ulid';
import { comparePassword, passwordHash } from './auth/password-hash';
import { generateAuthToken } from './auth/jwt';
import { authMiddleware } from './auth/auth.middleware';

const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());

connect();

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

app.post('/sign-up', async (req: Request, res: Response, next: NextFunction) => {
  const { email, name, password } = req.body;
  // check if user exists
  const userExists = await UserModel.findOne({ email: email });
  if (!!userExists) {
    next(new ErrorException(ErrorCode.DuplicateEntityError, { email }));
  }

  // generate password hash
  const hash = passwordHash(password);
  const newUser: IUser = {
    _id: ulid(),
    email,
    name,
    password: hash,
  };
  const created = await UserModel.create(newUser);
  res.send({ done: true });
});

app.post('/sign-in', async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  // check if user exists
  const userExists = await UserModel.findOne({ email: email });
  if (!userExists) {
    next(new ErrorException(ErrorCode.Unauthenticated));
  }

  // validate the password
  const validPassword = comparePassword(password, userExists.password);
  if (!validPassword) {
    next(new ErrorException(ErrorCode.Unauthenticated));
  }

  // generate the token
  const token = generateAuthToken(userExists);

  res.send({ token });
});

app.get('/protected-route', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  // data from the token that is verified
  const tokenData = req.body.tokenData;
  console.log('tokenData', tokenData);
  res.send('this is a protected route');
});

app.use(errorHandler); // registration of handler

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
