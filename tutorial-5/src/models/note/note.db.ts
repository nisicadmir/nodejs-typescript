import { IsString, MaxLength, MinLength } from 'class-validator';
import { model, Model, Schema } from 'mongoose';

export class Note {
  _id: string;

  title: string;
  body: string;

  authorId: string;

  createdAt: string;
  updatedAt: string;
}

const NoteSchema = new Schema<Note>(
  {
    _id: { type: String, required: true },

    title: { type: String, required: true },
    body: { type: String, required: true },

    authorId: { type: String, required: true },
  },
  { collection: 'note', timestamps: true }
);

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

export const NoteModel: Model<Note> = model('note', NoteSchema);
