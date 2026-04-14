/** JWT access token payload (sub = user id). */
export interface JwtPayload {
  sub:   string;
  email: string;
}
