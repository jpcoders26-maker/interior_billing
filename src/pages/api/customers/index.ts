import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const customers = await prisma.customer.findMany({
        include: { projects: true }
      })
      return res.status(200).json(customers)
    }

    if (req.method === 'POST') {
      const data = req.body
      const customer = await prisma.customer.create({ data })
      return res.status(201).json(customer)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
