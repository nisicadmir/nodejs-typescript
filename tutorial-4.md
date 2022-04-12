[Github repository](https://github.com/nisicadmir/nodejs-typescript)

In this tutorial we will learn how and why we need validating the data which is arriving on the API. Data validation is an essential part of an application whether the task is to collect information, analyze the data, prepare the data for presentation and many other use cases. It is important to verify the incoming data from the start because if the unwanted data is dragged on further through the application then it can happen that we have data that is not accurate.
While data validation is a critical and important step in any data workflow, unfortunately it is often skipped over. Data validation requires more time and thus it slows down the work, however, it is esential because it will help us to create a cleaner data flow.

Nowadays, data validation is becoming easier to implement thanks to the many libraries that exist. There are many libraries out there but I will mention only few of them: class-validator, joi, fastst-validator.
Just to mention that `NestJS`, which is a popular framework for building scalable Node.js applications, uses class-validator. `Moleculer` is another framework for building server side applications and is using fast-validator as default validator.

What is important to note is that some validators work with the json-schema (joi, fastest-validator) of objects while some validators work using classes by adding decorators (class-validator).

I personally think it is better to use a class based validator with the TypeScript language because it is not necessary to write classes and json-objects separately but we can use existing classes by adding decorators. Such is the case with class-validator and this is the library we will use in this tutorial.

## Modeling

We will create a simple model for creating notes.
```typescript
export class Note {
  _id: string;

  title: string;
  body: string;

  authorId: string;

  createdAt: string;
  updatedAt: string;
}
```


Code for mongoose.
```typescript
import { model, Model, Schema } from 'mongoose';
import { Note } from './note.model';

const NoteSchema = new Schema<Note>(
  {
    _id: { type: String, required: true },

    title: { type: String, required: true },
    body: { type: String, required: true },

    authorId: { type: String, required: true },
  },
  { collection: 'note', timestamps: true }
);

export const NoteModel: Model<Note> = model('note', NoteSchema);
```

We need to install class-validator library and add experimentalDecorators in tsconfig.json file
```
npm install --save class-validator
```

```json
{
  "compilerOptions": {
    "experimentalDecorators": true, // <- add this
    "target": "es5",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": "./",
    "paths": {},
    "esModuleInterop": true
  }
}

```

Now we can create models for validation and if we look at the code below, we will see that we have a couple of models.
- `Note` is a basic model which is used for mongoose for creating its schema.
- `NoteCreate` model is a model which is used to create data for MongoDB.
- `NoteCreateAPI` is a validation model which is the data that we expect to come to the API.

```typescript
import { IsString, MaxLength, MinLength } from 'class-validator';

// Actual model.
export class Note {
  _id: string;

  title: string;
  body: string;

  authorId: string;

  createdAt: string;
  updatedAt: string;
}

// Model for creating item in database.
export type NoteCreate = Pick<Note, '_id' | 'title' | 'body' | 'authorId'>;

// Validation model which comes to the API.
export class NoteCreateAPI implements Pick<Note, 'title' | 'body'> {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  title: string;

  @IsString()
  @MinLength(100)
  @MaxLength(5_000)
  body: string;
}
```

If we look at the `NoteCreateAPI` model we will see that we picked only `title` and `body` properties which are required in order to create the note. We will focus only on the property `title`. We added 3 decorators:
- @IsString() - value must be of type string.
- @MinLength(10) - value must be at least 10 characters long.
- @MaxLength(500) - value must be at most 500 characters long.

I have added only some basic decorators but there is a great flexibility on how we want that model to look. More about what our model can look like and what parameters we can include we can see the documentation from the library: [class-validator documentation](https://www.npmjs.com/package/class-validator).

We will now create a POST API method and send data to that route.

NOTE: The route is protected with authMiddleware we created in one of the previous tutorials.

```typescript
app.post('/note', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  // data from the token that is verified
  const noteNew = new NoteCreateAPI();
  noteNew.title = req.body.title;
  noteNew.body = req.body.body;

  // verify input parameters
  const errors = await validate(noteNew);
  if (errors.length) {
    next(new ErrorException(ErrorCode.ValidationError, errors));
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
  res.send(created);
});
```

Now that everything is prepared, we can check what happens when we send data which is not valid and when we send data which is valid.

If we look at `Example 1` we will see that the field `title` field is missing and that field `body` is missing the character length.
![Example 1](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-4/example_1.png "Example 1")

In `Example 2` we can see that the field `title` is present but the character lenght is not met, same is with field `body`.
![Example 2](https://github.com/nisicadmir/nodejs-typescript/blob/master/tutorial-4/example_2.png?raw=true "Example 2")

Finally in `Example 3` we can see that both `title` and `body` meet the requirements and that we have successfully created a note.
![Example 3](https://github.com/nisicadmir/nodejs-typescript/blob/master/tutorial-4/example_3.png?raw=true "Example 3")


# Wrapping up
In this tutorial we learned why it is important to have a validator in our application and we briefly looked at which libraries we can use in the Node.js application. We mentioned why I chose the class-validator library and finally created the code implementation that demonstrates a couple of examples of failed and one example of successful validation.
