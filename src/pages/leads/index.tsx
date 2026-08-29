import Link from 'next/link'
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'

export default function Leads(){
  const [leads,setLeads]=useState<any[]>([])
  useEffect(()=>{fetch('/api/leads').then(r=>r.json()).then(setLeads)},[])

  return (
    <Layout>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Leads</h2>
          <Link href="/leads/new"><button>New Lead</button></Link>
        </div>
        <ul>
          {leads.map(l=>(<li key={l.id}>{l.name} — {l.phone}</li>))}
        </ul>
      </div>
    </Layout>
  )
}
