import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function NewProject(){
  const [name,setName]=useState('')
  const [customerId,setCustomerId]=useState('')
  const [customers,setCustomers]=useState<any[]>([])
  const router = useRouter()

  useEffect(()=>{fetch('/api/customers').then(r=>r.json()).then(setCustomers)},[])

  async function submit(e:any){
    e.preventDefault()
    const res = await fetch('/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,customerId})})
    if(res.ok) router.push('/projects')
  }

  return (
    <Layout>
      <div className="card">
        <h2>New Project</h2>
        <form onSubmit={submit} style={{maxWidth:600}}>
          <div className="form-row"><input placeholder="Project name" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="form-row">
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
              <option value="">Select customer</option>
              {customers.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="form-row"><button type="submit">Create</button></div>
        </form>
      </div>
    </Layout>
  )
}
