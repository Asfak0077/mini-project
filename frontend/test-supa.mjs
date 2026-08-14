import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kxfdrixsoujxnsysslzq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZmRyaXhzb3VqeG5zeXNzbHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDg3NzAsImV4cCI6MjA4ODc4NDc3MH0.bP-JTicE71CojiJ1c9fsjN79oIEppkZKp4nxGZn_qbM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: 'admin',
      title: 'New Complaint Filed',
      message: 'A new complaint "test" was submitted.',
      type: 'complaint_submission',
      metadata: { complaintId: 'CMP-1003' },
      read: false
    }])
    
  if (error) {
    console.log(JSON.stringify(error, null, 2))
  } else {
    console.log("Success")
  }
}

run()
