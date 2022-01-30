[Github repository](https://github.com/nisicadmir/nodejs-typescript)

Why do we need error handling at all?

Imagine that a client application (web, mobile...) is using the server. Sometimes we need to handle exceptions which appear in the application and we need to send a clear message to the user what is wrong. It is very important to have a working error handler inside the application in order to achieve better user experience and for many other reasons as well. Beside from the user experience, it is a good practice to catch errors in one place (all the errors go through the handler) so the developer can track the bugs/exceptions more easily.

## Creating exceptions

An exception is created using the `throw` keyword inside the application.

```typescript
throw Error('Error');
```

As soon as the application executes this line the normal flow is halted and the control is switched to the nearest exception handler. While in some other environments we can throw strings, objects etc, in Node.js we throw `error objects`. An error object is an object derived from `Error` or an instance of `Error` itself.

Throwing an error from derived `Error` object looks like:

```typescript
class SomethingIsWrongError extends Error {
  constructor() {
    super('Something is wrong!');
  }
}
throw new SomethingIsWrongError();
```

Before we start creating our error handler we need to decide what is the right way to go. Most of my applications have supported/support multiple languages which means that the message needs to be translated into the language which the user has selected. We cannot show errors in English language if the user has selected Japanese language which means the error message needs to be translated somewhere. Either we translate the message on the server side or on the client side.

- Server side translation
  In order to translate the message on the server side we have to know to whom we are sending the exception in order to get the selected language from the user. Challenge of this approach is that a developer needs always to have the selected language of the user whenever an error message needs to be sent to the client side.

- Client side translation
  Other solution is to send an unique error code and any additional data if needed so the translation of exceptions should be done on the client side based on the code and this is the solution which I prefer.

The client side needs to know:

- Status code.
- Unique error code. Every error has its own unique code.
- Metadata if any. If any additional dynamic data needs to be sent in order to translate the message like what is the maximum allowed input number etc.

In order to keep track of all the errors more easily, we need to create a class in which we will store all possible errors that we know about. When we throw an exception then we will refer to one of the codes found in that class.

Create a folder called `error-handler` in the root directory and this will be the place where we will create files for error handler logic. Create a file called `error-code.ts` with following code:

```typescript
export class ErrorCode {
  public static readonly Unauthenticated = 'Unauthenticated';
  public static readonly NotFound = 'NotFound';
  public static readonly MaximumAllowedGrade = 'MaximumAllowedGrade';
  public static readonly AsyncError = 'AsyncError';
  public static readonly UnknownError = 'UnknownError';
}
```

We also need to have a model that we will return to the client. Create a file called `error-model.ts` inside `error-handler` folder with following code:

```typescript
export class ErrorModel {
  /**
   * Unique error code which identifies the error.
   */
  public code: string;
  /**
   * Status code of the error.
   */
  public status: number;
  /**
   * Any additional data that is required for translation.
   */
  public metaData?: any;
}
```

And now we need to create the actual error exception object. Create a file called `error-exception.ts` inside `error-handler` folder with following code:

```typescript
import { ErrorCode } from './error-code';

export class ErrorException extends Error {
  public status: number = null;
  public metaData: any = null;
  constructor(code: string = ErrorCode.UnknownError, metaData: any = null) {
    super(code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = code;
    this.status = 500;
    this.metaData = metaData;
    switch (code) {
      case ErrorCode.Unauthenticated:
        this.status = 401;
        break;
      case ErrorCode.MaximumAllowedGrade:
        this.status = 400;
        break;
      case ErrorCode.AsyncError:
        this.status = 400;
        break;
      case ErrorCode.NotFound:
        this.status = 404;
        break;
      default:
        this.status = 500;
        break;
    }
  }
}
```

When we want to throw an error from our application we use exactly the class we created and one code from the available list of codes. We would throw an error like:

```typescript
throw new ErrorException(ErrorCode.MaximumAllowedGrade, { max: 100 }); // object is optional
```

## Error handler

Error handler is a special middleware in Node.js which takes 4 parameters. Regular route middleware takes 3 parameters: req, res and next. Error handler also takes these 3 parameters and one additional parameter which is the actual error. Those four parameters are (retrospectively):

1. err
2. req
3. res
4. next

Create file called `error-handler.ts` inside `error-handler` folder. The following handler will intercept all errors that occur in the application whether it is an exception that we know or an exception that we do not know. In order to recognize that it is an exception thrown by ourselves, we can recognize it by type of instance `if (err instanceof ErrorException) `

```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from './error-code';
import { ErrorException } from './error-exception';
import { ErrorModel } from './error-model';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.log('Error handling middleware called.');
  console.log('Path:', req.path);
  console.error('Error occured:', err);
  if (err instanceof ErrorException) {
    console.log('Error is known.');
    res.status(err.status).send(err);
  } else {
    // For unhandled errors.
    res.status(500).send({ code: ErrorCode.UnknownError, status: 500 } as ErrorModel);
  }
};
```

Now it is necessary to register this handler and we will register it as follows. The handler needs to be 'lowered' as far as possible in the application after all routes and other middlewares and handlers. If we specify routes or middlewares after registration of `errorHandler` then the error handler will not catch exceptions which appear in those routes or middlewares.

```typescript
app.use(errorHandler); // registration of handler

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
```

Now we are ready to throw some errors.

```typescript
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
```

If you look at the code above, you will see that we have 2 `known` exceptions and one `unknown`. When we want to throw an exception from a route we can do it with the `throw` keyword or by calling the `next` function with an actual exception. Error handler will catch both exceptions. However, when it comes to async logic then it will be solved in another way which we will cover next.

## Exceptions with promises

By Exress documentation:
Handling sync code:
`Errors that occur in synchronous code inside route handlers and middleware require no extra work. If synchronous code throws an error, then Express will catch and process it. For example:`

```typescript
app.get('/', function (req, res) {
  throw new Error('BROKEN'); // Express will catch this on its own.
});
```

Handling async code:
`For errors returned from asynchronous functions invoked by route handlers and middleware, you must pass them to the next() function, where Express will catch and process them. For example:`

```typescript
app.get('/', function (req, res, next) {
  fs.readFile('/file-does-not-exist', function (err, data) {
    if (err) {
      next(err); // Pass errors to Express.
    } else {
      res.send(data);
    }
  });
});
```

`Starting with Express 5, route handlers and middleware that return a Promise will call next(value) automatically when they reject or throw an error. For example:`

```typescript
app.get('/user/:id', async function (req, res, next) {
  // if error appears in getUserById, express will automatically throw an error
  const user = await getUserById(req.params.id);
  res.send(user);
});
```

Let's add code into our application for async code. The code will always throw an error and regarding if we are using express 4 or express 5, the application will catch the error.

```typescript
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
```

# Wrapping up
In this tutorial we covered what exceptions are and how to throw an exception in application. We learned what we need to consider when handling exceptions in multi language applications. We learned to do everything necessary for the Node.JS application to successfully manage exceptions from creating necessary classes to creating a handler and registering it. And finally we learned how to throw exceptions and what to take care of when throwing exceptions in async or sync blocks.

Comming up: Authentication with JWT.
