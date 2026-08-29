import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextApiResponse } from 'next'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET)
}

export function setTokenCookie(res: NextApiResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production'
  const cookie = `token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

export function clearTokenCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
}
