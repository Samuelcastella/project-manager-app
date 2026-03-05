import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { resolveRequestId } from "./request-id.js";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const requestId = resolveRequestId(request?.headers ?? {});

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      response.status(status).send({
        requestId,
        error: {
          status,
          message: payload
        }
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      requestId,
      error: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error"
      }
    });
  }
}
