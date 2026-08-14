const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Teacher = require('../models/Teacher')
const { mapTeacher } = require('../utils/mapDocs')
const { inMemoryStore } = require('../utils/inMemoryStore')

const router = express.Router()

const nextTeacherId = (count) => `TCH${String(count + 1001).padStart(4, '0')}`

router.get('/', async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json(inMemoryStore.getTeachers())
  }
  try {
    const teachers = await Teacher.find({}).sort({ createdAt: -1 })
    return res.json(teachers.map(mapTeacher))
  } catch {
    return res.json(inMemoryStore.getTeachers())
  }
})

router.post('/', async (req, res) => {
  const { name, department, email, designation } = req.body
  if (!name || !department) {
    return res.status(400).json({ message: 'Name and department are required' })
  }

  if (mongoose.connection.readyState !== 1) {
    const newTeacher = inMemoryStore.createTeacher(req.body)
    return res.status(201).json(newTeacher)
  }

  const count = await Teacher.countDocuments()
  const teacherId = nextTeacherId(count)
  const passwordHash = await bcrypt.hash('teach123', 10)

  const teacher = await Teacher.create({
    teacherId,
    name,
    department,
    email: email ?? '',
    designation: designation ?? 'Professor',
    passwordHash
  })

  return res.status(201).json(mapTeacher(teacher))
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params

  if (mongoose.connection.readyState !== 1) {
    inMemoryStore.deleteTeacher(id)
    return res.json({ ok: true })
  }

  await Teacher.deleteOne({ teacherId: id })
  return res.json({ ok: true })
})

module.exports = router
