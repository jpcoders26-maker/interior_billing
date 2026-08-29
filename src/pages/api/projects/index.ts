import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const projects = await prisma.project.findMany({ include: { customer: true } })
      return res.status(200).json(projects)
    }

    if (req.method === 'POST') {
      const data = req.body
      const project = await prisma.project.create({ data })
      return res.status(201).json(project)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
