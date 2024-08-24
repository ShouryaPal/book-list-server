import express, { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../schema/userSchema";
import dotenv from "dotenv";

dotenv.config();

const router: Router = express.Router();

// REGISTER
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUser = new User({ email, password: hashedPassword, name });
    const savedUser = await newUser.save();
    res.status(200).json(savedUser);
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post("/login", async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json("User not found!");
    }

    const match = await bcrypt.compare(req.body.password, user.password);

    if (!match) {
      return res.status(401).json("Wrong credentials!");
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email, name: user.name },
      process.env.SECRET as string,
      { expiresIn: "3d" }
    );

    const { password, ...info } = user.toObject();
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true when in production
        sameSite: "none",
        maxAge: 3 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json(info);
  } catch (err: any) {
    res.status(500).json(err);
  }
});

// LOGOUT
router.get("/logout", (req: Request, res: Response) => {
  try {
    res
      .clearCookie("token", { sameSite: "none", secure: true })
      .status(200)
      .send("User logged out successfully!");
  } catch (err: any) {
    res.status(500).json(err);
  }
});

// REFETCH USER
router.get("/refetch", (req: Request, res: Response) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.SECRET as string, {}, async (err, data) => {
    if (err) {
      return res.status(404).json(err);
    }
    res.status(200).json(data);
  });
});

// GET USER INFO
router.get("/info/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err: any) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
export default router;
