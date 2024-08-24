import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userAuthRoute from "./routes/userAuth";
import bookRoutes from "./routes/booksRoute";

dotenv.config();

const app = express();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URl as string  );
    console.log("Database is connected successfully!");
  } catch (err) {
    console.error("Database connection error:", err);
  }
};

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("/api/user/auth", userAuthRoute);
app.use("/api/books", bookRoutes);

app.listen(process.env.PORT, () => {
  connectDB();
  console.log("app is running on port " + process.env.PORT);
});
