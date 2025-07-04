import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  cloudinaryUrl: { type: String, required: true }, // Cloudinary URL
  cloudinaryPublicId: { type: String, required: true }, // For deletion purposes
  uploadedAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  role: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true },
  files: [FileSchema] // Array of files with Cloudinary URLs
});

const ChatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    messages: [MessageSchema],
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);

export default Chat;