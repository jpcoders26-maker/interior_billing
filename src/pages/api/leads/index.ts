import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const leads = await prisma.lead.findMany()
      return res.status(200).json(leads)
    }

    if (req.method === 'POST') {
      const data = req.body
      const lead = await prisma.lead.create({ data })
      return res.status(201).json(lead)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
