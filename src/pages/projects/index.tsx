import Link from 'next/link'
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'

export default function Projects(){
  const [projects,setProjects]=useState<any[]>([])
  useEffect(()=>{fetch('/api/projects').then(r=>r.json()).then(setProjects)},[])

  return (
    <Layout>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Projects</h2>
          <Link href="/projects/new"><button>New Project</button></Link>
        </div>
        <ul>
          {projects.map(p=>(<li key={p.id}>{p.name} — {p.customer?.name || p.customerId}</li>))}
        </ul>
      </div>
    </Layout>
  )
}
