/**
 * The HTTP status codes this API returns, and nothing more.
 */
export class HttpStatus {
  public static readonly OK = 200;
  public static readonly CREATED = 201;
  public static readonly BAD_REQUEST = 400;
  public static readonly UNAUTHORIZED = 401;
  public static readonly FORBIDDEN = 403;
  public static readonly NOT_FOUND = 404;
  public static readonly CONFLICT = 409;
  public static readonly TOO_MANY_REQUESTS = 429;
  public static readonly INTERNAL_SERVER_ERROR = 500;
  public static readonly SERVICE_UNAVAILABLE = 503;

  private static readonly REASON_CODES: ReadonlyMap<number, string> = new Map([
    [HttpStatus.OK, 'OK'],
    [HttpStatus.CREATED, 'CREATED'],
    [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'],
    [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
    [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
    [HttpStatus.CONFLICT, 'CONFLICT'],
    [HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED'],
    [HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR'],
    [HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE'],
  ]);

  private static readonly FALLBACK_CODE = 'INTERNAL_ERROR';

  private constructor() {
    // Static-only utility; never instantiated.
  }

  public static toReasonCode(status: number): string {
    return HttpStatus.REASON_CODES.get(status) ?? HttpStatus.FALLBACK_CODE;
  }

  public static isServerError(status: number): boolean {
    return status >= 500;
  }

  public static isClientError(status: number): boolean {
    return status >= 400 && status < 500;
  }
}
