import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { verifyPassword, signToken, setTokenCookie } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await verifyPassword(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken({ id: user.id, email: user.email, role: user.role })
    setTokenCookie(res, token)
    return res.status(200).json({ id: user.id, name: user.name, email: user.email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
