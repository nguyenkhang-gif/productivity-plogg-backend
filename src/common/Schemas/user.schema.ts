// src/schemas/user.schema.ts
import { Schema } from 'mongoose';

export const UserSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: false,
    default: '',
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female'],
  },
  profilePic: {
    type: String,
    default: 'https://avatar.iran.liara.run/public',
  },
  role: {
    type: String,
    default: 'customer',
    enum: ['customer', 'admin'],
  },
  membership: {
    type: String,
    default: 'basic',
    enum: ['basic', 'advance', 'vip'],
  },
});
