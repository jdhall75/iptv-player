import * as jose from 'jose';

/**
 * Generate a JWT token for a user
 */
export async function generateToken(
  userId: string,
  secret: string,
  expiresIn: string = '15m'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  const token = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<{ userId: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    if (payload.userId && typeof payload.userId === 'string') {
      return { userId: payload.userId };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a refresh token (longer expiration)
 */
export async function generateRefreshToken(
  userId: string,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  return generateToken(userId, secret, expiresIn);
}
