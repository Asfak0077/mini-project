const http = require('http')

const request = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://127.0.0.1:5001')
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve({ status: res.statusCode, data: parsed })
        } catch {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })

    req.on('error', reject)
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

async function runAuditTests() {
  console.log('\n======================================================')
  console.log('🚀 RUNNING COMPLETE BACKEND API ENDPOINT AUDIT & VERIFICATION')
  console.log('======================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition, title, details = '') => {
    if (condition) {
      passed++
      console.log(` ✅ PASS: ${title}`)
    } else {
      failed++
      console.error(` ❌ FAIL: ${title} - ${details}`)
    }
  }

  try {
    // 1. Health Check
    const health = await request('/api/health')
    assert(health.status === 200 && health.data.ok, 'API Health Check (/api/health)')

    // 2. Student Login
    const studentAuth = await request('/api/auth/login', 'POST', {
      email: 'student@campusresolve.edu',
      password: 'password123'
    })
    assert(studentAuth.status === 200 && studentAuth.data.accessToken, 'Student Login (POST /api/auth/login)', JSON.stringify(studentAuth.data))
    const studentToken = studentAuth.data.accessToken

    // 3. Teacher Login
    const teacherAuth = await request('/api/auth/teacher-login', 'POST', {
      teacherId: 'TCH-CSE-001',
      password: 'teach123'
    })
    assert(teacherAuth.status === 200 && teacherAuth.data.accessToken, 'Teacher Login (POST /api/auth/teacher-login)', JSON.stringify(teacherAuth.data))
    const teacherToken = teacherAuth.data.accessToken

    // 4. Admin Login
    const adminAuth = await request('/api/auth/login', 'POST', {
      email: 'admin@campusresolve.edu',
      password: 'admin123'
    })
    assert(adminAuth.status === 200 && adminAuth.data.accessToken, 'Admin Login (POST /api/auth/login)', JSON.stringify(adminAuth.data))
    const adminToken = adminAuth.data.accessToken

    // 5. Session Restore / ME
    const me = await request('/api/auth/me', 'GET', null, studentToken)
    assert(me.status === 200 && me.data.user && me.data.user.email === 'student@campusresolve.edu', 'Session Restore (GET /api/auth/me)', JSON.stringify(me.data))

    // 6. Get Profile
    const profile = await request('/api/profile', 'GET', null, studentToken)
    assert(profile.status === 200 && profile.data.success, 'Student Profile Fetch (GET /api/profile)')

    // 7. Get All Complaints (Admin)
    const adminComplaints = await request('/api/complaints/admin/all-complaints', 'GET', null, adminToken)
    assert(adminComplaints.status === 200 && Array.isArray(adminComplaints.data.complaints) && adminComplaints.data.total > 0, 'Admin All Complaints Fetch (GET /api/complaints/admin/all-complaints)', `Count: ${adminComplaints.data.total}`)

    // 8. Create Complaint
    const newComplaint = await request('/api/complaints/create', 'POST', {
      title: 'Audited Automated Test Complaint',
      category: 'Infrastructure',
      department: 'CSE',
      description: 'Automated test suite verification complaint description',
      priority: 'high',
      studentData: {
        name: 'Student User',
        email: 'student@campusresolve.edu',
        studentId: 'CR21CS001',
        phone: '+91 98765 43210'
      }
    }, studentToken)
    assert(newComplaint.status === 201 && newComplaint.data.complaint, 'Create Complaint (POST /api/complaints/create)')
    const createdId = newComplaint.data.complaint.id

    // 9. Fetch Student Complaints
    const studentComplaints = await request('/api/complaints/student/CR21CS001', 'GET', null, studentToken)
    assert(studentComplaints.status === 200 && studentComplaints.data.total > 0, 'Student Complaints Fetch (GET /api/complaints/student/CR21CS001)')

    // 10. Fetch Teacher Complaints
    const teacherComplaints = await request('/api/complaints/teacher/TCH-CSE-001', 'GET', null, teacherToken)
    assert(teacherComplaints.status === 200 && Array.isArray(teacherComplaints.data.complaints), 'Teacher Complaints Fetch (GET /api/complaints/teacher/TCH-CSE-001)')

    // 11. Fetch Complaint Details
    const complaintDetails = await request(`/api/complaints/details/${createdId}`, 'GET', null, studentToken)
    assert(complaintDetails.status === 200 && (complaintDetails.data._id === createdId || complaintDetails.data.id === createdId), 'Complaint Details Fetch (GET /api/complaints/details/:id)')

    // 12. Update Complaint Status
    const updateStatus = await request(`/api/complaints/${createdId}/update-status`, 'PUT', {
      newStatus: 'In Progress',
      resolutionNotes: 'Inspection underway by backend automated test runner'
    }, teacherToken)
    assert(updateStatus.status === 200 && updateStatus.data.complaint.status === 'In Progress', 'Update Complaint Status (PUT /api/complaints/:id/update-status)')

    // 13. Notifications Fetch
    const notifications = await request('/api/notifications', 'GET', null, studentToken)
    assert(notifications.status === 200 && Array.isArray(notifications.data.notifications), 'Notifications Fetch (GET /api/notifications)')

    // 14. Teachers List Fetch
    const teachersList = await request('/api/teachers', 'GET', null, adminToken)
    assert(teachersList.status === 200 && Array.isArray(teachersList.data) && teachersList.data.length > 0, 'Teachers List Fetch (GET /api/teachers)')

    // 15. Feedback Submission
    const feedback = await request('/api/feedback', 'POST', {
      complaintId: createdId,
      studentName: 'Student User',
      studentId: 'CR21CS001',
      department: 'CSE',
      teacherId: 'TCH-CSE-001',
      teacherName: 'Dr. Rajesh Kumar',
      rating: 5,
      category: 'Infrastructure',
      comment: 'Excellent verification test feedback'
    }, studentToken)
    assert(feedback.status === 201 && feedback.data.success, 'Feedback Submission (POST /api/feedback)')

    // 16. Get Feedback List
    const feedbackList = await request('/api/feedback', 'GET', null, adminToken)
    assert(feedbackList.status === 200 && Array.isArray(feedbackList.data) && feedbackList.data.length > 0, 'Feedback List Fetch (GET /api/feedback)')

    console.log('\n======================================================')
    console.log(`📊 API AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================\n')
  } catch (err) {
    console.error('❌ Audit runner error:', err)
  }
}

runAuditTests()
