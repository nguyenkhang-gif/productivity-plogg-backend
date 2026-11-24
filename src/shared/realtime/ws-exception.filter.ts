import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class WsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const response = exception.getResponse();
    const message =
      typeof response === 'string' ? response : (response as any).message;

    const statusCode = exception.getStatus();

    client.emit('exception', {
      status: 'error',
      statusCode,
      message,
    });
  }
}
