import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Token {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true, default: false })
  isRevoked: boolean;
}



export  const TokenSchema = SchemaFactory.createForClass(Token);