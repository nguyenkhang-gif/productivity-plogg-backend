import { Controller, Post, Body, UseGuards, Request, Get, Patch } from '@nestjs/common';
import { RegisterDto } from '../../core/dtos/register.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterUseCase } from 'src/use-case/auth/register.use-case';
import { LoginUseCase } from 'src/use-case/auth/login.use-case';
import { ProfileUseCase } from 'src/use-case/auth/profile.use-case';
import { UpdateProfileUseCase } from 'src/use-case/auth/update-profile.use-case';
import { UpdateProfileDto } from 'src/core/dtos/update-profile.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly profileUseCase: ProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
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

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.updateProfileUseCase.execute(req.user.userId, dto);
  }
}
