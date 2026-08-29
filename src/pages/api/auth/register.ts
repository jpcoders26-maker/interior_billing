import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { hashPassword, signToken, setTokenCookie } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { name, email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'User already exists' })

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({ data: { name, email, password: hashed } })

    const token = signToken({ id: user.id, email: user.email, role: user.role })
    setTokenCookie(res, token)
    return res.status(201).json({ id: user.id, name: user.name, email: user.email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
