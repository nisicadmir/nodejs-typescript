[Github repository](https://github.com/nisicadmir/nodejs-typescript)

I don't think it's necessary to explain why we need to have an authentication system in an application at all. You've probably heard of the terms `authentication` and `authorization` and I have to point out that these words have different meanings.
"Authentication is the act of validating that users are whom they claim to be. This is the first step in any security process. " Okta.com
"Authorization in system security is the process of giving the user permission to access a specific resource or function. This term is often used interchangeably with access control or client privilege." Okta.com

In this tutorial we will learn how to make an authentication system using JWT.


## Database models

We will first have to deal with the database because we need to store user data somewhere. We need to store email and hashed password which will be used later for the sign in process. For this tutorial we will use NoSQL MongoDB database and we will also use mongoose. Mongoose is a MongoDB object modeling tool which is designed to work in an asynchronous environment and supports both promises and callbacks.

We will install the necessary packages:
```
npm install --save mongoose
npm install --save-dev @types/mongoose
```

After the packages are installed, we can start making the model. We will create a model for the user who will have the fields _id, email, name and password. We will also create a unique email index so that there are no two users with the same email in our database.
We will create the `user.db.ts` file in folder `src/models/user`.

```typescript
import { model, Model, Schema } from 'mongoose';

export interface IUser {
  _id: string;
  email: string;
  password: string;
  name: string;
}

const IUserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  { collection: 'user', timestamps: true }
);

export const UserModel: Model<IUser> = model('user', IUserSchema);
```
Now lets create a connection to the MongoDB database via mongoose. We will call the file `mongoose.index.ts` and place it folder`src/models`.
> Note: We need to have a MongoDB database running in order to connect to it. If you use docker you can find the `docker-compose.yml` file on github which link is provided in this tutorial and just run `docker-compose up -d`.

```typescript
import mongoose, { Connection } from 'mongoose';

let mongooseConnection: Connection = null;
export async function connect(): Promise<void> {
  try {
    mongoose.connection.on('connecting', () => {
      console.log(`MongoDB: connecting.`);
    });
    mongoose.connection.on('connected', () => {
      console.log('MongoDB: connected.');
    });
    mongoose.connection.on('disconnecting', () => {
      console.log('MongoDB: disconnecting.');
    });
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: disconnected.');
    });

    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
      const conn = await mongoose.connect('mongodb://localhost:27017/ts-tutorial', { // <- replace connection string if necessary
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      });
      mongooseConnection = conn.connection;
    }
  } catch (error) {
    console.log(`Error connecting to DB`, error);
  }
}

```

Now in the `server.ts` file we can call the method for connecting to the database:
```typescript
connect();
```
Align the imports for `connect` function.

If the application is successfully connected to the database then we should get the messages from log:
```bash
MongoDB: connecting.
Application started on port 3000!
MongoDB: connected
```

# Sign up process
We will first create an endpoint to which we will send data to create a new user. We will add the new route in the `server.ts` file. Email, name and password fields are required (we will not do the validation of parameters). After that, we must first check if there is an existing user with the same email and only after we determine that the user does not exist, can we proceed further.
The next step is to make a hash of the plain password because the plain password is never stored in the database. So when we create a new user we take his plain password, make a hash and keep the hash in the database. We will need the hashed password later for the sign in process.


Required npm packages:
```bash
npm install --save ulid
npm install --save bcrypt
npm install --save-dev @types/bcrypt
```

```typescript
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
```
> Note: Add the code in `server.ts` file before the routes for encoding the data that is being sent to our application from the client side.
```typescript
const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());
```

We used the bcrypt library to create a hash from a plain password. Create a file `crypto.lib.ts` in a new folder `src/lib`. The code for hashing and comparing plain and hashed passwords:
```typescript
import bcrypt from 'bcrypt';

export const passwordHash = (plainPassword: string): string => {
  const hash = bcrypt.hashSync(plainPassword, 10);
  return hash;
};

export const comparePassword = (plainPassword: string, passwordHash: string): boolean => {
  const compared = bcrypt.compareSync(plainPassword, passwordHash);
  return compared;
};
```
In the code above, you can see that we have two functions. The `passwordHash` function will hash a plain password.
The `comparePassword` function will check that the plain password entered is the same as the hash from the database. We will need this method later for the login form.

Additional steps:
- align imports
```typescript
import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import { errorHandler } from './error-handler/error-handler';
import { ErrorException } from './error-handler/error-exception';
import { ErrorCode } from './error-handler/error-code';
import { connect } from './models/mongoose.index';
import { IUser, UserModel } from './models/user/user.db'; // <- new import
import { passwordHash } from './lib/crypto.lib'; // <- new import
import { ulid } from 'ulid'; // <- new import
```
- add new enum value `ErrorCode.DuplicateEntityError`
```typescript
export class ErrorCode {
  public static readonly Unauthenticated = 'Unauthenticated';
  public static readonly NotFound = 'NotFound';
  public static readonly MaximumAllowedGrade = 'MaximumAllowedGrade';
  public static readonly AsyncError = 'AsyncError';
  public static readonly DuplicateEntityError = 'DuplicateEntityError'; // <- new enum value
  public static readonly UnknownError = 'UnknownError';
}
```

If we have successfully created a user in the database, the next step is to create a JWT when the user tries to sign in.

## Sign in process
As we said in the introduction, we will use the jsonwebtoken package and for that we need to install the packages:
```bash
npm install --save jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

Actually how does it work? It is necessary to create a route for sign in where it will be necessary to enter email and password.

We will first check if there is a user with the provided email and if there is one, then we will take the password hash that is saved in the database. It is necessary to check whether the plain password from the login form agrees with the hash password from the database using the `comparePassword` method. If the method returns true then the user has entered a good password, otherwise the method will return false.

After that, it is necessary to generate jsonwebtoken through the mentioned library. We will generate the JWT with the help of a secret key which we keep in our application and the client should not be aware of the secret key. We will generate that jsonwebtoken string and return that token to the client application.

Create new file `auth.lib.ts` inside `src/lib` folder with following code:
```typescript
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
```

```typescript
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
```

Additional steps:
- align imports in `server.ts` file
```typescript
...
import { ulid } from 'ulid';
import { generateAuthToken } from './lib/auth.lib'; // <- new import
```

## Authentication middleware
We will create one middleware called `authMiddleware` which we will put on the routes where we need to have protection and whose job will be to check if the JWT that was generated is valid. `authMiddleware` function is just a middleware function which will get a token from the header and check its validation. We can check the validation of the token with the function `verifyToken` which is placed inside our middleware. We will create file `auth.middleware.ts` inside `src/middlewares` folder.

```typescript
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
```

The client side is required to send the JWT token string in the header for each API call that requires authentication. Header with authorization token looks like:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIXVCJ9TJV...r7E20RMHrHDcEfxjoYZgeFONFh7HgQ
```

Protected route with middleware:
```typescript
app.get('/protected-route', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  // data from the token that is verified
  const tokenData = req.body.tokenData;
  console.log('tokenData', tokenData);
  res.send('this is a protected route');
});
```
Align the imports in `server.ts`


# Wrapping up
In this tutorial we covered how to create basic models with `mongoose` and `MongoDB` and how to connect to MongoDB instances. We also learned how to create a new user and save the user in the database and what is important, how to create a hash password using the `bcrypt` library. After saving the user, we showed how to create a sign in process and generate a token using the `jsonwebtoken` library. Finally, we demonstrated how to create one middleware to be placed on a route to protect certain routes.
