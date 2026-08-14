const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your_') || supabaseServiceKey.includes('your_')) {
  console.warn('⚠️ WARNING: Missing or placeholder Supabase credentials in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

module.exports = { supabase }
