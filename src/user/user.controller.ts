import { Body, Controller, UseGuards, Get, Post } from '@nestjs/common';
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
  async editUserInfo() {} // }, //   member: string; //   role: string; //   gender: string; //   confirmPassword: string; //   password: string; //   username: string; //   fullName: string; // body: { // @Body()

  @Post('update')
  async updateUserInfo(
    @Body()
    data: object,
  ) {
    console.log(data, 'update this shit');
    await this.authService.updateObject(data);
  }
}
