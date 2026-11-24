import { DriveService } from './drive.service';

describe('DriveService Excel conversion', () => {
  it('round-trips sheets of rows through xlsx', async () => {
    const service = new DriveService();
    const data = {
      January: [
        ['date', 'category', 'amount'],
        ['2026-01-02', 'food', 120000],
        [],
        ['2026-01-05', 'rent', 3500000],
      ],
      February: [['date', 'amount']],
    };
    const buffer = await service.convertJsonToXlsxBuffer(data);
    jest.spyOn(service, 'assertFileInFolder').mockResolvedValue(undefined);
    jest.spyOn(service, 'downloadFileAsBuffer').mockResolvedValue(buffer);

    const parsed = await service.convertExcelToJson('file-1');

    expect(Object.keys(parsed)).toEqual(['January', 'February']);
    expect(parsed.January[0]).toEqual(['date', 'category', 'amount']);
    expect(parsed.January[1]).toEqual(['2026-01-02', 'food', 120000]);
    expect(parsed.January[3]).toEqual(['2026-01-05', 'rent', 3500000]);
    expect(parsed.February).toEqual([['date', 'amount']]);
  });
});
