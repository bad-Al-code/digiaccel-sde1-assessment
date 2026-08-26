import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
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
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: MAX_EMAIL_LENGTH,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    refreshTokenHash: { type: String, default: null, select: false },
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

        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);
