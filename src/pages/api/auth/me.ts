import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'

function getTokenFromHeader(req: NextApiRequest) {
  const cookie = req.headers.cookie || ''
  const match = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('token='))
  if (!match) return null
  return match.split('=')[1]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const payload: any = verifyToken(token)
    if (!payload?.id) return res.status(401).json({ error: 'Invalid token' })

    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id:true, name:true, email:true, role:true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.status(200).json(user)
  } catch (err:any) {
    console.error(err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
