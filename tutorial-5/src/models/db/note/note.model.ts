import { IsString, MaxLength, MinLength } from 'class-validator';

export class Note {
  _id: string;

  title: string;
  body: string;

  authorId: string;

  createdAt: string;
  updatedAt: string;
}

export type NoteCreate = Pick<Note, '_id' | 'title' | 'body' | 'authorId'>;

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
