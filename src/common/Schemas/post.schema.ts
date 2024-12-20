import { Schema } from 'mongoose';

export const PostSchema = new Schema({
  userid: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imgurl: {
    type: [String], // Mảng các chuỗi
    required: false,
  },
  caption: {
    type: String,
    required: false,
  },
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  status: {
    visibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'public',
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  properties: {
    type: Object,
    require: false,
  },
});
