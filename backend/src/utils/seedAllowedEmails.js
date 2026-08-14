const AllowedEmail = require('../models/AllowedEmail')

const seedAllowedEmails = async () => {
    if (require('mongoose').connection.readyState !== 1) return
    const emails = [
        'student@campusresolve.edu',
        'admin@campusresolve.edu',
        'asf28146@gmail.com',
        'eswaraprasath115@gmail.com'
    ]

    console.log('--- Seeding Allowed Emails ---')

    for (const email of emails) {
        const normalized = email.toLowerCase()
        const exists = await AllowedEmail.findOne({ email: normalized })
        if (!exists) {
            await AllowedEmail.create({ email: normalized })
            console.log(`[+] Added ${normalized} to allowlist`)
        } else {
            console.log(`[=] ${normalized} already exists`)
        }
    }

    console.log('--- Allowed Emails Seeded ---\n')
}

module.exports = { seedAllowedEmails }
