// src/users/interfaces/user.interface.ts
import { Document } from 'mongoose';

export interface IUser extends Document {
  readonly fullName: string;
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly gender: string;
  readonly profilePic: string;
  readonly membership: string;
  readonly role: string;
}
export interface IResponseUser {
  readonly _id: string;
  readonly fullName: string;
  readonly username: string;
  readonly profilePic: string;
  readonly membership: string;
  readonly role: string;
}
