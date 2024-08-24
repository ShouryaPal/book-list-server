import express, { Request, Response } from "express";
import Book, { IBook } from "../schema/books";
import ExchangeRequest, { IExchangeRequest } from "../schema/exchangeRequest";
import mongoose from "mongoose";

const router = express.Router();

// Get all books
router.get("/", async (req: Request, res: Response) => {
  try {
    const books = await Book.find({ isAvailable: true }).populate(
      "owner",
      "username"
    );
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Error fetching books", error });
  }
});

// Post a new book
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, author, genre, owner } = req.body;
    const newBook: IBook = new Book({
      title,
      author,
      genre,
      owner,
    });
    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    res.status(400).json({ message: "Error creating book", error });
  }
});

// Get user's books
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const books = await Book.find({
      owner: userId,
    }).populate("owner", "username");
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user's books", error });
  }
});

// Get a single book by ID
router.get("/:bookId", async (req: Request, res: Response) => {
  try {
    const bookId = req.params.bookId;
    const book = await Book.findById(bookId).populate("owner", "username");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: "Error fetching book", error });
  }
});

// Update a book
router.put("/:bookId", async (req: Request, res: Response) => {
  try {
    const bookId = req.params.bookId;
    const { title, author, genre, isAvailable } = req.body;
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { title, author, genre, isAvailable },
      { new: true }
    );
    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ message: "Error updating book", error });
  }
});

// Initiate a book exchange
router.post("/exchange", async (req: Request, res: Response) => {
  try {
    const { requesterId, requestedBookId, offeredBookId } = req.body;

    const requestedBook = await Book.findById(requestedBookId);
    const offeredBook = await Book.findById(offeredBookId);

    if (!requestedBook || !offeredBook) {
      return res.status(404).json({ message: "One or both books not found" });
    }

    if (!requestedBook.isAvailable || !offeredBook.isAvailable) {
      return res
        .status(400)
        .json({ message: "One or both books are not available for exchange" });
    }

    const newExchangeRequest: IExchangeRequest = new ExchangeRequest({
      requester: new mongoose.Types.ObjectId(requesterId),
      requestedBook: new mongoose.Types.ObjectId(requestedBookId),
      offeredBook: new mongoose.Types.ObjectId(offeredBookId),
    });

    await newExchangeRequest.save();

    requestedBook.exchangeRequests.push(
      newExchangeRequest._id as mongoose.Types.ObjectId
    );
    await requestedBook.save();

    res.status(201).json({
      message: "Exchange request created successfully",
      exchangeRequest: newExchangeRequest,
    });
  } catch (error) {
    res.status(500).json({ message: "Error initiating exchange", error });
  }
});

// Get exchange requests for a book
router.get(
  "/exchange-requests/:bookId",
  async (req: Request, res: Response) => {
    try {
      const bookId = req.params.bookId;
      const book = await Book.findById(bookId).populate({
        path: "exchangeRequests",
        populate: [
          { path: "requester", select: "username" },
          { path: "offeredBook", select: "title author" },
        ],
      });

      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(book.exchangeRequests);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching exchange requests", error });
    }
  }
);

// Accept or reject an exchange request
router.put("/exchange/:requestId", async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
      return res.status(404).json({ message: "Exchange request not found" });
    }

    exchangeRequest.status = status;
    await exchangeRequest.save();

    if (status === "accepted") {
      const requestedBook = await Book.findById(exchangeRequest.requestedBook);
      const offeredBook = await Book.findById(exchangeRequest.offeredBook);

      if (requestedBook && offeredBook) {
        const tempOwner = requestedBook.owner;
        requestedBook.owner = offeredBook.owner;
        offeredBook.owner = tempOwner;

        requestedBook.exchangeRequests = [];
        offeredBook.exchangeRequests = [];

        // Update isAvailable status to false for both books
        requestedBook.isAvailable = false;
        offeredBook.isAvailable = false;

        await requestedBook.save();
        await offeredBook.save();
      }
    }

    res.json({ message: `Exchange request ${status}`, exchangeRequest });
  } catch (error) {
    res.status(500).json({ message: "Error updating exchange request", error });
  }
});

router.get("/user-exchanges/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const sentRequests = await ExchangeRequest.find({ requester: userId })
      .populate("requestedBook", "title author")
      .populate("offeredBook", "title author");

    const receivedRequests = await ExchangeRequest.find({
      requestedBook: { $in: await Book.find({ owner: userId }).select("_id") },
    })
      .populate("requester", "username")
      .populate("requestedBook", "title author")
      .populate("offeredBook", "title author");

    res.json({ sent: sentRequests, received: receivedRequests });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user's exchange requests", error });
  }
});

// Delete a book
router.delete("/:bookId", async (req: Request, res: Response) => {
  try {
    const bookId = req.params.bookId;
    const deletedBook = await Book.findByIdAndDelete(bookId);

    if (!deletedBook) {
      return res.status(404).json({ message: "Book not found" });
    }
    await ExchangeRequest.updateMany(
      { $or: [{ requestedBook: bookId }, { offeredBook: bookId }] },
      { $set: { status: "cancelled" } }
    );

    res.json({ message: "Book successfully deleted", deletedBook });
  } catch (error) {
    res.status(500).json({ message: "Error deleting book", error });
  }
});

export default router;
