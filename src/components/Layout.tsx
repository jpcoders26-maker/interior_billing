import Link from 'next/link'
import React from 'react'

export default function Layout({ children }:{ children: React.ReactNode }){
  return (
    <div className="container">
      <header style={{marginBottom:12}}>
        <h1>Furniture Billing</h1>
        <nav className="nav">
          <Link href="/">Dashboard</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/quotations">Quotations</Link>
          <Link href="/leads">Leads</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
