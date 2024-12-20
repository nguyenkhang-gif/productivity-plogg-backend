import { Schema, Types } from 'mongoose';
export const EpubSchema = new Schema({
  status: {
    visibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'private',
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  epubInfo: {
    author: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    thumbnails: {
      type: String,
      required: true,
    },
    chapters: [],
  },
  properties: {
    type: Object,
  },
  userId: {
    type: Types.ObjectId,
    ref: 'User', // Tham chiếu đến model User
    required: true, // Đảm bảo rằng userId phải được cung cấp
  },
});
