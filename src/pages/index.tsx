import Layout from '../components/Layout'

export default function Dashboard(){
  return (
    <Layout>
      <div className="card">
        <h2>Dashboard</h2>
        <p>Business overview and quick links.</p>
        <div className="grid" style={{marginTop:12}}>
          <div className="card">Total Sales<br/><strong>—</strong></div>
          <div className="card">Receivable<br/><strong>—</strong></div>
          <div className="card">Active Projects<br/><strong>—</strong></div>
          <div className="card">Overdue Invoices<br/><strong>—</strong></div>
        </div>
      </div>
    </Layout>
  )
}
