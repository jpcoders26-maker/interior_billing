import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function NewLead(){
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const router = useRouter()

  async function submit(e:any){
    e.preventDefault()
    const res = await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,phone})})
    if(res.ok) router.push('/leads')
  }

  return (
    <Layout>
      <div className="card">
        <h2>New Lead</h2>
        <form onSubmit={submit} style={{maxWidth:600}}>
          <div className="form-row"><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="form-row"><input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
          <div className="form-row"><button type="submit">Create</button></div>
        </form>
      </div>
    </Layout>
  )
}
