import mongoose from 'mongoose';
import { BRAG_STATUS, PRIORITIES } from '../utils/constants.js';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    bragStatus: {
      type: String,
      enum: Object.values(BRAG_STATUS),
      default: BRAG_STATUS.GREEN
    },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    comments: [commentSchema]
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Task', taskSchema);
