export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  /** 'password' (correo) o 'google.com' */
  provider: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}