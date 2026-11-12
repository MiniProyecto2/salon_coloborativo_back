export interface FieldError {
  field: string;
  message: string;
}

/** Error con código HTTP; el middleware de errores lo convierte en una respuesta JSON clara. */
export class HttpError extends Error {
  readonly status: number;
  readonly details: FieldError[] | undefined;

  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}