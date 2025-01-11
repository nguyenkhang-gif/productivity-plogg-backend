import * as jwt from 'jsonwebtoken';
export class TokenFactory {
  static createAccessToken(payload: any): string {
    console.log('payload', payload);

    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: '1h',
    });
  }
  static createRefreshToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });
  }
}
