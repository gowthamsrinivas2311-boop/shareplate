import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing ID is required'],
      index: true
    },
    reserverName: {
      type: String,
      required: [true, 'Reserver name is required'],
      trim: true
    },
    reserverContact: {
      type: String,
      required: [true, 'Reserver contact is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    pickupCode: {
      type: String,
      required: [true, 'Pickup code is required'],
      select: false
    },
    status: {
      type: String,
      enum: {
        values: ['reserved', 'collected', 'cancelled', 'no_show'],
        message: '{VALUE} is not a valid reservation status'
      },
      default: 'reserved',
      index: true
    },
    collectedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

reservationSchema.index({ reserverContact: 1, pickupCode: 1 });
reservationSchema.index({ listingId: 1, status: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
