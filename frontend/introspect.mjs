const supabaseUrl = 'https://kxfdrixsoujxnsysslzq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZmRyaXhzb3VqeG5zeXNzbHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDg3NzAsImV4cCI6MjA4ODc4NDc3MH0.bP-JTicE71CojiJ1c9fsjN79oIEppkZKp4nxGZn_qbM'

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`)
    const json = await res.json()
    console.log(JSON.stringify(json.definitions.notifications, null, 2))
  } catch(e) {
    console.error(e)
  }
}
run()
