import { Body, Controller, UseGuards,Get, Post, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/common/guards/auth.guard';



@Controller('api/user')
export class UserController {
  constructor(private authService: UserService) {}

  @Get('get')
  getService(): string {
    return 'this is auth service';
  }

  @UseGuards(AuthGuard)
  @Get('users')
  async getAllUsers() {
    const users = await this.authService.getAllUsers();
    return users;
  }

  @Post('editUser')
  async editUserInfo(
    @Body()
    body: {
      fullName: string;
      username: string;
      password: string;
      confirmPassword: string;
      gender: string;
      role: string;
      member: string;
    },
    @Res() res: Response,
  ) {}

  @Post('update')
  async updateUserInfo(
    @Body()
    data: Object
  ){
    console.log(data,"update this shit");
    await this.authService.updateObject(data);
  }




}
