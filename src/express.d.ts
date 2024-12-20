import { Request } from 'express';

declare module 'express' {
  export interface Request {
    user?: any; // Bạn có thể thay 'any' bằng một kiểu cụ thể nếu bạn biết kiểu của `user`
  }
}
