import mongoose, { Document, Schema } from "mongoose";

export interface IExchangeRequest extends Document {
  requester: mongoose.Types.ObjectId;
  requestedBook: mongoose.Types.ObjectId;
  offeredBook: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
}

const ExchangeRequestSchema: Schema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedBook: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    offeredBook: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IExchangeRequest>(
  "ExchangeRequest",
  ExchangeRequestSchema
);
