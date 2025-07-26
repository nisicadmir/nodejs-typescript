/* eslint-disable @typescript-eslint/no-unused-vars */

import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import { errorHandler } from './error-handler/error-handler';
import { ErrorException } from './error-handler/error-exception';
import { ErrorCode } from './error-handler/error-code';
import { connect } from './models/mongoose.index';
import { IUser, UserModel } from './models/user/user.db';
import { comparePassword, passwordHash } from './lib/crypto.lib';
import { ulid } from 'ulid';
import { generateAuthToken } from './lib/auth.lib';
import { authMiddleware } from './middlewares/auth.middleware';
import { NoteCreate, NoteCreateAPI, NoteModel } from './models/note/note.db';
import { validate } from 'class-validator';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

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
  // try {
  //   await someOtherFunction();
  // } catch (err) {
  //   next(err);
  //   // next line will not work as expected
  //   // throw err
  // }
  // express 5
  await someOtherFunction();
});

app.post('/sign-up', async (req: Request, res: Response, next: NextFunction) => {
  const { email, name, password } = req.body;
  // check if user exists
  const userExists = await UserModel.findOne({ email: email });
  if (userExists) {
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
  await UserModel.create(newUser);
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

app.post('/note', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  // data from the token that is verified
  const noteNew = new NoteCreateAPI();
  noteNew.title = req.body.title;
  noteNew.body = req.body.body;

  // verify input parameters
  const errors = await validate(noteNew);
  if (errors.length) {
    throw new ErrorException(ErrorCode.ValidationError, errors);
  }

  // create note data
  const tokenData: { _id: string; email: string } = req.body.tokenData;
  const noteCreate: NoteCreate = {
    _id: ulid(),
    title: noteNew.title,
    body: noteNew.body,

    authorId: tokenData._id,
  };

  const created = await NoteModel.create(noteCreate);
  res.send({ note: created });
});

app.use(errorHandler); // registration of handler

// Create a new HTTP server for socket.io
const socketServer = http.createServer();
const io = new SocketIOServer(socketServer, {
  cors: {
    origin: '*', // Adjust this to your needs
    methods: ['GET', 'POST'],
  },
});

// Listen for socket.io connections
io.on('connection', (socket) => {
  // Listen for socket.io connections
  io.on('connection', (socket) => {
    console.log('New connection created');

    // Get the auth token provided on handshake.
    const token = socket.handshake.auth.token;
    console.log('Auth token', token);

    try {
      // Verify the token here and get user info from JWT token.
    } catch (error) {
      socket.disconnect(true);
    }

    // A client is disconnected.
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });

    // Read message recieved from client.
    socket.on('message_from_client', (data) => {
      console.log('message_from_client: ', data);
    });

    // Send a message to the connected client 5 seconds after the connection is created.
    setTimeout(() => {
      socket.emit('message_from_server', `Message: ${Math.random()}`);
    }, 5_000);
  });

  /**
   * New code
   */
  // Get the room number from the client.
  const roomNumber: string = socket.handshake.query.roomNumber as string;
  // Join room for specific users.
  const room = `room-userId-${roomNumber}`;
  socket.join(room);

  // Emit to room by room number.
  setTimeout(() => {
    io.to(room).emit('room-userId', `You are in room number: ${roomNumber}. Message: ${Math.random()}`);
  }, 2_000);

  // Add more socket event handlers here
});

// Start the socket.io server on a different port, e.g., 4000
socketServer.listen(4000, () => {
  console.log('Socket.io server started on port 4000');
});

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
