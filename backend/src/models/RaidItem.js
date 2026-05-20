import mongoose from 'mongoose';
import { RAID_STATUSES, RAID_TYPES } from '../utils/constants.js';

const raidItemSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, enum: RAID_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    status: { type: String, enum: RAID_STATUSES, default: 'Open' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    impact: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    mitigation: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

raidItemSchema.index({ project: 1, type: 1, status: 1 });

export default mongoose.model('RaidItem', raidItemSchema);
