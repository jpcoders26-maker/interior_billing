import Link from 'next/link'
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'

export default function Quotations(){
  const [quotes,setQuotes]=useState<any[]>([])
  useEffect(()=>{fetch('/api/quotations').then(r=>r.json()).then(setQuotes)},[])

  return (
    <Layout>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Quotations</h2>
          <Link href="/quotations/new"><button>New Quotation</button></Link>
        </div>
        <ul>
          {quotes.map(q=>(<li key={q.id}>{q.title} — {q.customer?.name || q.customerId}</li>))}
        </ul>
      </div>
    </Layout>
  )
}
