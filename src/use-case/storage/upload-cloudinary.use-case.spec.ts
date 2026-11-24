import { ForbiddenException } from '@nestjs/common';
import { UploadCloudinaryUseCase } from './upload-cloudinary.use-case';

describe('UploadCloudinaryUseCase.deleteFile ownership', () => {
  const repo = {
    upload: jest.fn(),
    listFiles: jest.fn(),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new UploadCloudinaryUseCase(repo as any);

  beforeEach(() => repo.deleteFile.mockClear());

  it('allows deleting own upload and icon', async () => {
    await useCase.deleteFile('uploads/u1/abc', 'u1', 'user');
    await useCase.deleteFile('icons/u1/abc', 'u1', 'user');
    expect(repo.deleteFile).toHaveBeenCalledTimes(2);
  });

  it('rejects other users files', async () => {
    await expect(
      useCase.deleteFile('uploads/u2/abc', 'u1', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.deleteFile).not.toHaveBeenCalled();
  });

  it('rejects prefix collisions and traversal', async () => {
    await expect(
      useCase.deleteFile('uploads/u10/abc', 'u1', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      useCase.deleteFile('uploads/u1/../u2/abc', 'u1', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      useCase.deleteFile('other/asset', 'u1', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets admins delete anything', async () => {
    await useCase.deleteFile('uploads/u2/abc', 'admin1', 'admin');
    expect(repo.deleteFile).toHaveBeenCalledWith('uploads/u2/abc');
  });
});
