import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['cooked', 'packaged', 'produce', 'bakery', 'other'],
        message: '{VALUE} is not a valid category'
      }
    },
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true
    },
    donorContact: {
      type: String,
      required: [true, 'Donor contact is required'],
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Total quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['portions', 'kg', 'packs'],
        message: '{VALUE} is not a valid unit'
      }
    },
    pickupStart: {
      type: Date,
      required: [true, 'Pickup start time is required']
    },
    pickupEnd: {
      type: Date,
      required: [true, 'Pickup end time is required']
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'sold_out', 'expired', 'cancelled'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        const expiresAtMs = doc.expiresAt ? new Date(doc.expiresAt).getTime() : Infinity;
        const pickupEndMs = doc.pickupEnd ? new Date(doc.pickupEnd).getTime() : Infinity;
        const effectiveDeadlineMs = Math.min(expiresAtMs, pickupEndMs);
        const effectiveDeadline = new Date(effectiveDeadlineMs);
        ret.effectiveDeadline = effectiveDeadline;

        const now = Date.now();
        if ((ret.status === 'active' || ret.status === 'sold_out') && effectiveDeadlineMs <= now) {
          ret.status = 'expired';
        }

        return ret;
      }
    }
  }
);

listingSchema.index({ status: 1, expiresAt: 1, pickupEnd: 1 });
listingSchema.index({ donorContact: 1 });
listingSchema.index({ category: 1 });

export const Listing = mongoose.model('Listing', listingSchema);
export default Listing;
