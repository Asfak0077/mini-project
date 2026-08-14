const axios = require('axios')
require('dotenv').config({ path: './backend/.env' })

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

async function testEmailRoute() {
  console.log('--- Testing Professional Email Reset Route ---')
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/request-password-reset`, {
      email: 'student@campusresolve.edu' // Use the test user
    })
    console.log('✓ Response Status:', response.status)
    console.log('✓ Response Data:', response.data)
  } catch (error) {
    console.error('❌ Error testing route:', error.response?.status, error.response?.data || error.message)
    if (error.response?.data?.message?.includes('Service Role')) {
        console.warn('⚠ Note: This failure confirms that a real Service Role Key is needed for this feature.')
    }
  }
}

testEmailRoute()
