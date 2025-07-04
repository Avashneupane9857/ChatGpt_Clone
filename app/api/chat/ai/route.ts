export const maxDuration = 60;
import OpenAI from "openai";
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { uploadToCloudinary } from "../../../../config/cloudinary";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

console.log("API Key loaded:", process.env.OPENAI_API_KEY?.slice(0, 10));

// Function to upload files to Cloudinary
const uploadFilesToCloudinary = async (files: UploadedFile[]) => {
  const uploadPromises = files.map(async (file) => {
    try {
      let fileBuffer;
      
      if (file.type.startsWith('image/')) {
        // For images, content is base64 data URL
        const base64Data = file.content.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // For text files, convert content to buffer
        fileBuffer = Buffer.from(file.content, 'utf8');
      }

      const { url, publicId } = await uploadToCloudinary(fileBuffer, file.name, file.type);
      
      return {
        ...file,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId,
      };
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}`);
    }
  });

  return Promise.all(uploadPromises);
};

// Function to process file content based on type
const processFileContent = (file: UploadedFile): string => {
  if (file.type.startsWith('image/')) {
    return `[Image: ${file.name}]\nThis is an image file. Please analyze the image content.`;
  } else if (file.type === 'application/pdf') {
    return `[PDF Document: ${file.name}]\nContent: ${file.content}`;
  } else if (file.type === 'text/plain') {
    return `[Text Document: ${file.name}]\nContent: ${file.content}`;
  } else if (file.type.includes('word')) {
    return `[Word Document: ${file.name}]\nContent: ${file.content}`;
  } else if (file.type.includes('excel') || file.type.includes('csv')) {
    return `[Spreadsheet: ${file.name}]\nContent: ${file.content}`;
  } else {
    return `[Document: ${file.name}]\nContent: ${file.content}`;
  }
};

// Function to create OpenAI messages with file support
const createMessagesWithFiles = (messages: any[]) => {
  return messages.map(msg => {
    if (msg.role === 'user' && msg.files && msg.files.length > 0) {
      let content = msg.content;
      
      // Process each file
      msg.files.forEach((file: UploadedFile) => {
        if (file.type.startsWith('image/')) {
          // For images, use OpenAI's vision capability with Cloudinary URL
          return {
            role: msg.role,
            content: [
              {
                type: "text",
                text: content
              },
              {
                type: "image_url",
                image_url: {
                  url: file.cloudinaryUrl || file.content
                }
              }
            ]
          };
        } else {
          // For other files, append content as text
          content += `\n\n${processFileContent(file)}`;
        }
      });
      
      return {
        role: msg.role,
        content: content
      };
    }
    
    return {
      role: msg.role,
      content: msg.content
    };
  });
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const { chatId, prompt, files = [], isEdit, editIndex } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }

    await connectDB();
    const chat = await Chat.findOne({ userId, _id: chatId });
    
    if (!chat) {
      return NextResponse.json({ success: false, message: "Chat not found" });
    }

    // Upload files to Cloudinary if any
    let uploadedFiles: UploadedFile[] = [];
    if (files.length > 0) {
      try {
        uploadedFiles = await uploadFilesToCloudinary(files);
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: "Failed to upload files to Cloudinary" 
        });
      }
    }

    // Create user message with files
    let userContent = prompt;
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((file: UploadedFile) => {
        if (!file.type.startsWith('image/')) {
          userContent += `\n\n${processFileContent(file)}`;
        }
      });
    }

    const userPrompt = {
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      files: uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        cloudinaryUrl: file.cloudinaryUrl,
        cloudinaryPublicId: file.cloudinaryPublicId,
        uploadedAt: new Date()
      }))
    };

    if (isEdit && typeof editIndex === 'number') {
      chat.messages = chat.messages.slice(0, editIndex);
      chat.messages.push(userPrompt);
    } else {
      chat.messages.push(userPrompt);
    }

    // Prepare messages for OpenAI
    const conversationMessages = createMessagesWithFiles(chat.messages);

    // Check if we have images to use GPT-4 Vision
    const hasImages = uploadedFiles.some((file: UploadedFile) => file.type.startsWith('image/'));
    const model = hasImages ? "gpt-4o" : "gpt-3.5-turbo";

    let completion;
    
    if (hasImages) {
      // For images, use the vision model with specific message format
      const visionMessages = [];
      
      // Add conversation context (last few messages without images)
      const contextMessages = conversationMessages.slice(-5, -1).map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || ''
      }));
      
      visionMessages.push(...contextMessages);
      
      // Add the current message with image
      const currentMessageContent = [];
      currentMessageContent.push({
        type: "text",
        text: prompt
      });
      
      uploadedFiles.forEach((file: UploadedFile) => {
        if (file.type.startsWith('image/')) {
          currentMessageContent.push({
            type: "image_url",
            image_url: {
              url: file.cloudinaryUrl || file.content
            }
          });
        }
      });
      
      visionMessages.push({
        role: "user",
        content: currentMessageContent
      });

      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: visionMessages,
        max_tokens: 1000,
        stream: false
      });
    } else {
      // For text-only messages, use regular GPT
      completion = await openai.chat.completions.create({
        messages: conversationMessages,
        model: "gpt-3.5-turbo",
        stream: false
      });
    }

    const rawMessage = completion.choices[0].message;
    const message = {
      ...rawMessage,
      timestamp: Date.now()
    };

    chat.messages.push(message);
    console.log(message);
    
    await chat.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.log("Error in /api/chat/ai:", error);
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}