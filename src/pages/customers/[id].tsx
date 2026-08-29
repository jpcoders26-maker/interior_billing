import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'

export default function CustomerView(){
  const router = useRouter()
  const { id } = router.query
  const [customer,setCustomer] = useState<any>(null)

  useEffect(()=>{ if(id) fetch(`/api/customers/${id}`).then(r=>r.json()).then(setCustomer) },[id])

  if(!customer) return (<Layout><div className="card">Loading…</div></Layout>)

  return (
    <Layout>
      <div className="card">
        <h2>{customer.name}</h2>
        <div>Mobile: {customer.mobile}</div>
        <div style={{marginTop:12}}>
          <h3>Projects</h3>
          <ul>
            {customer.projects?.map((p:any)=>(<li key={p.id}>{p.name} — ₹{p.contractValue||'—'}</li>))}
          </ul>
        </div>
      </div>
    </Layout>
  )
}
