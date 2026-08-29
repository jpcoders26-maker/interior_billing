import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function NewCustomer(){
  const [name,setName]=useState('')
  const [mobile,setMobile]=useState('')
  const router = useRouter()

  async function submit(e:any){
    e.preventDefault()
    const res = await fetch('/api/customers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,mobile})})
    if(res.ok) router.push('/customers')
  }

  return (
    <Layout>
      <div className="card">
        <h2>New Customer</h2>
        <form onSubmit={submit} style={{maxWidth:600}}>
          <div className="form-row"><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="form-row"><input placeholder="Mobile" value={mobile} onChange={e=>setMobile(e.target.value)} /></div>
          <div className="form-row"><button type="submit">Create</button></div>
        </form>
      </div>
    </Layout>
  )
}
