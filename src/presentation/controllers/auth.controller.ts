import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { RegisterDto } from '../../core/dtos/register.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterUseCase } from 'src/use-case/auth/register.use-case';
import { LoginUseCase } from 'src/use-case/auth/login.use-case';
import { ProfileUseCase } from 'src/use-case/auth/profile.use-case';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly profileUseCase: ProfileUseCase,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any) { // Log request body
    
    // req.user is set by the LocalStrategy
    return this.loginUseCase.execute(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    console.log('Authenticated user:', req.user); 
    
    // req.user is set by the JwtStrategy
    return this.profileUseCase.execute(req.user);
  }
}
