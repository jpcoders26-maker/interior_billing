import Link from 'next/link'
import Layout from '../../components/Layout'
import { useEffect, useState } from 'react'

type Customer = any

export default function CustomersPage(){
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(()=>{fetch('/api/customers').then(r=>r.json()).then(setCustomers)},[])

  return (
    <Layout>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Customers</h2>
          <Link href="/customers/new"><button>New Customer</button></Link>
        </div>
        <div style={{marginTop:12}}>
          {customers.length===0? <p className="muted">No customers yet.</p> : (
            <ul>
              {customers.map(c=> (
                <li key={c.id} style={{padding:'8px 0',borderBottom:'1px solid #eee'}}>
                  <Link href={`/customers/${c.id}`}>{c.name}</Link>
                  <div style={{color:'#6b7280'}}>{c.mobile}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}
