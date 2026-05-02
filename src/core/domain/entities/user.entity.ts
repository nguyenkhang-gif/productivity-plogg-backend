export class User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    passwordHash: string;
    gender: string;
    profilePic?: string;
    membership?: string;
    role?: string;
    isPrivate?: boolean;
    resetPasswordToken?: string;
    createdAt?: Date;
    updatedAt?: Date;
  
    constructor(partial: Partial<User>) {
      Object.assign(this, partial);
    }
  }
  