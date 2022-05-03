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
