import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string | null;
  passwordHash: string | null;
  refreshTokenHash: string | null;
  isGuest: boolean;
  fingerprintHash: string | null;
  guestTaskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;

/** RFC maximum */
const MAX_EMAIL_LENGTH = 320;

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      maxlength: MAX_EMAIL_LENGTH,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenHash: { type: String, default: null, select: false },
    isGuest: { type: Boolean, default: false, required: true },
    fingerprintHash: { type: String, default: null, select: false },
    guestTaskCount: { type: Number, default: 0, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.fingerprintHash;
        delete ret.guestTaskCount;

        return ret;
      },
    },
  },
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
userSchema.index(
  { fingerprintHash: 1 },
  { partialFilterExpression: { fingerprintHash: { $type: 'string' } } },
);

export const UserModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);
