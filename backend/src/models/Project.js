import mongoose from 'mongoose';
import { BRAG_STATUS } from '../utils/constants.js';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    bragStatus: {
      type: String,
      enum: Object.values(BRAG_STATUS),
      default: BRAG_STATUS.GREEN
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    planConfig: {
      showDescription: { type: Boolean, default: true },
      showAssignee: { type: Boolean, default: true },
      showDates: { type: Boolean, default: true },
      showBragStatus: { type: Boolean, default: true },
      showPriority: { type: Boolean, default: true },
      showProgress: { type: Boolean, default: true },
      showCost: { type: Boolean, default: false },
      showRaci: { type: Boolean, default: false }
    },
    costSummary: {
      plannedCost: { type: Number, min: 0, default: 0 },
      actualCost: { type: Number, min: 0, default: 0 },
      variance: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Project', projectSchema);
