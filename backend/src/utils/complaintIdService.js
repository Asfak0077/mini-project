const mongoose = require('mongoose')
const Counter = require('../models/Counter')
const Complaint = require('../models/Complaint')
const { inMemoryStore } = require('./inMemoryStore')

/**
 * Formats a sequential integer into the required CampusResolve Complaint ID format:
 * CR-001, CR-002, ..., CR-010, ..., CR-100, etc.
 * Always at least 3 digits.
 */
function formatComplaintId(seqNumber) {
  const num = Math.max(1, parseInt(seqNumber, 10) || 1)
  return `CR-${String(num).padStart(3, '0')}`
}

/**
 * Extracts sequence number from a Complaint ID string (e.g. 'CR-027' -> 27)
 */
function parseComplaintSeq(idStr) {
  if (!idStr || typeof idStr !== 'string') return 0
  const match = idStr.match(/^CR-(\d+)$/i)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Atomically generates the next unique sequential Complaint ID.
 * Starts from CR-001 and increments by 1 for each complaint.
 */
async function getNextComplaintId() {
  if (mongoose.connection.readyState === 1) {
    try {
      // Ensure counter is at least initialized to max existing complaint count
      const counter = await Counter.findByIdAndUpdate(
        'complaintSeq',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      )
      return formatComplaintId(counter.seq)
    } catch (err) {
      console.error('Error generating sequential Complaint ID from MongoDB:', err.message)
      // Fallback query to find max existing
      const latest = await Complaint.findOne({ complaintId: /^CR-\d+$/i }).sort({ createdAt: -1 })
      const maxSeq = latest ? parseComplaintSeq(latest.complaintId) : 0
      const nextSeq = maxSeq + 1
      await Counter.findByIdAndUpdate('complaintSeq', { seq: nextSeq }, { upsert: true }).catch(() => {})
      return formatComplaintId(nextSeq)
    }
  }

  // Fallback to in-memory store
  return inMemoryStore.getNextComplaintId()
}

/**
 * Safe startup migration:
 * Scans all existing complaints in MongoDB and in-memory store.
 * Backfills any complaint missing a CR-XXX formatted complaintId
 * in chronological order (createdAt ASC), without breaking any data or primary keys.
 */
async function initializeAndMigrateComplaintIds() {
  console.log('🔄 Initializing CampusResolve Complaint ID sequence & safe migration...')

  // 1. In-Memory Store migration
  try {
    if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      let memoryMaxSeq = 0
      const sortedMem = [...inMemoryStore.complaints].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      )

      for (const comp of sortedMem) {
        if (comp.complaintId && /^CR-\d+$/i.test(comp.complaintId)) {
          const seq = parseComplaintSeq(comp.complaintId)
          if (seq > memoryMaxSeq) memoryMaxSeq = seq
        }
      }

      for (const comp of sortedMem) {
        if (!comp.complaintId || !/^CR-\d+$/i.test(comp.complaintId)) {
          memoryMaxSeq += 1
          comp.complaintId = formatComplaintId(memoryMaxSeq)
        }
      }

      inMemoryStore._persist()
    }
  } catch (err) {
    console.error('Error during inMemoryStore Complaint ID migration:', err.message)
  }

  // 2. MongoDB migration
  if (mongoose.connection.readyState === 1) {
    try {
      const allComplaints = await Complaint.find({}).sort({ createdAt: 1 })
      let mongoMaxSeq = 0

      // First pass: find highest existing CR-XXX sequence
      for (const comp of allComplaints) {
        if (comp.complaintId && /^CR-\d+$/i.test(comp.complaintId)) {
          const seq = parseComplaintSeq(comp.complaintId)
          if (seq > mongoMaxSeq) mongoMaxSeq = seq
        }
      }

      // Second pass: backfill complaints that don't have CR-XXX format
      let migratedCount = 0
      for (const comp of allComplaints) {
        if (!comp.complaintId || !/^CR-\d+$/i.test(comp.complaintId)) {
          mongoMaxSeq += 1
          const newComplaintId = formatComplaintId(mongoMaxSeq)
          await Complaint.updateOne({ _id: comp._id }, { $set: { complaintId: newComplaintId } })
          comp.complaintId = newComplaintId
          migratedCount++
        }
      }

      // Initialize counter to the highest sequence number
      await Counter.findByIdAndUpdate(
        'complaintSeq',
        { $set: { seq: mongoMaxSeq } },
        { upsert: true }
      )

      console.log(`✓ Complaint ID sequence ready. Current max sequence: ${mongoMaxSeq} (${migratedCount} records backfilled)`)
    } catch (err) {
      console.error('Error during MongoDB Complaint ID migration:', err.message)
    }
  }
}

module.exports = {
  formatComplaintId,
  parseComplaintSeq,
  getNextComplaintId,
  initializeAndMigrateComplaintIds
}
