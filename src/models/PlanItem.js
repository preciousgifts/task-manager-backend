import mongoose from 'mongoose';
import { BRAG_STATUS, PLAN_ITEM_TYPES, PRIORITIES, RACI_ROLES } from '../utils/constants.js';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const raciAssignmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    responsibility: { type: String, enum: RACI_ROLES, required: true }
  },
  { _id: false }
);

const planItemSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'PlanItem', default: null },
    type: { type: String, enum: PLAN_ITEM_TYPES, required: true },
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
    progress: { type: Number, min: 0, max: 100, default: 0 },
    plannedCost: { type: Number, min: 0, default: 0 },
    actualCost: { type: Number, min: 0, default: 0 },
    raci: [raciAssignmentSchema],
    comments: [commentSchema]
  },
  { timestamps: true }
);

planItemSchema.index({ project: 1, parent: 1, type: 1 });
planItemSchema.index({ title: 'text', description: 'text' });

planItemSchema.pre('save', function markOverdue(next) {
  if (this.dueDate < new Date() && this.bragStatus !== BRAG_STATUS.BLUE) {
    this.bragStatus = BRAG_STATUS.RED;
  }
  next();
});

planItemSchema.virtual('costVariance').get(function costVariance() {
  return (this.actualCost || 0) - (this.plannedCost || 0);
});

planItemSchema.set('toJSON', { virtuals: true });
planItemSchema.set('toObject', { virtuals: true });

export default mongoose.model('PlanItem', planItemSchema);
