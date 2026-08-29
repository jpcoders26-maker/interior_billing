import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  try {
    if (req.method === 'GET') {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: { projects: true, quotations: true, invoices: true }
      })
      return res.status(200).json(customer)
    }

    if (req.method === 'PUT') {
      const data = req.body
      const customer = await prisma.customer.update({ where: { id }, data })
      return res.status(200).json(customer)
    }

    if (req.method === 'DELETE') {
      await prisma.customer.delete({ where: { id } })
      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
