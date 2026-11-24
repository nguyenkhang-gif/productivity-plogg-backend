import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/security/jwt-auth.guard';
import { PutVaultDto } from 'src/modules/productivity/vault/application/dto/vault.dto';
import { GetVaultUseCase } from 'src/modules/productivity/vault/application/get-vault.use-case';
import { PutVaultUseCase } from 'src/modules/productivity/vault/application/put-vault.use-case';
import { DeleteVaultUseCase } from 'src/modules/productivity/vault/application/delete-vault.use-case';

// Zero-knowledge vault: bodies are opaque ciphertext — never log them.
@UseGuards(JwtAuthGuard)
@Controller('api/vault')
export class VaultController {
  constructor(
    private readonly getVault: GetVaultUseCase,
    private readonly putVault: PutVaultUseCase,
    private readonly deleteVault: DeleteVaultUseCase,
  ) {}

  @Get('tasks')
  get(@Req() req) {
    return this.getVault.execute(req.user.userId, 'tasks');
  }

  @Put('tasks')
  put(@Body() body: PutVaultDto, @Req() req) {
    return this.putVault.execute(req.user.userId, 'tasks', body);
  }

  @Delete('tasks')
  delete(@Req() req) {
    return this.deleteVault.execute(req.user.userId, 'tasks');
  }
}
