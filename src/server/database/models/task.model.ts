import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
  type UpdateQuery,
} from 'mongoose';
import { getWeekStart } from '@/lib/week-range';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES, TaskStatus } from '@/types';
import type { TaskPriority, TaskStatus as TaskStatusType } from '@/types';

export interface TaskDocument {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  status: TaskStatusType;
  priority: TaskPriority | null;
  completedAt: Date | null;
  weekStart: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type TaskHydrated = HydratedDocument<TaskDocument>;

const taskSchema = new Schema<TaskDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    status: {
      type: String,
      enum: TASK_STATUS_VALUES,
      default: TaskStatus.IN_PROGRESS,
      required: true,
    },
    priority: { type: String, enum: [...TASK_PRIORITY_VALUES, null], default: null },
    completedAt: { type: Date, default: null },
    weekStart: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.ownerId;

        return ret;
      },
    },
  },
);

taskSchema.pre('validate', function (this: TaskHydrated) {
  if (this.isNew || this.isModified('startAt')) {
    this.weekStart = getWeekStart(this.startAt);
  }

  if (this.endAt !== null && this.endAt !== undefined && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'endAt must be strictly after startAt');
  }
});

taskSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function (this: mongoose.Query<unknown, TaskDocument>) {
    const update = this.getUpdate() as UpdateQuery<TaskDocument> | null;

    if (!update || Array.isArray(update)) {
      return;
    }

    const nextStartAt = update.$set?.startAt ?? update.startAt;

    if (nextStartAt === undefined || nextStartAt === null) {
      return;
    }

    const weekStart = getWeekStart(new Date(nextStartAt as string | number | Date));
    update.$set = { ...update.$set, weekStart };
    delete update.weekStart;

    this.setUpdate(update);
  },
);

taskSchema.index({ ownerId: 1, weekStart: 1, startAt: 1 });
taskSchema.index({ ownerId: 1, status: 1 });
taskSchema.index({ ownerId: 1, startAt: 1 });
taskSchema.index({ title: 'text', description: 'text' });

export const TaskModel: Model<TaskDocument> =
  (mongoose.models.Task as Model<TaskDocument> | undefined) ??
  mongoose.model<TaskDocument>('Task', taskSchema);
