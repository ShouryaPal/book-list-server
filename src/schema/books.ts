import mongoose, { Document, Schema } from "mongoose";

export interface IBook extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  author: string;
  genre: string;
  owner: mongoose.Types.ObjectId;
  isAvailable: boolean;
    exchangeRequests: mongoose.Types.ObjectId[];
}

const BookSchema: Schema = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isAvailable: { type: Boolean, default: true },
  exchangeRequests: [{ type: Schema.Types.ObjectId, ref: "ExchangeRequest" }],
});

export default mongoose.model<IBook>("Book", BookSchema);
