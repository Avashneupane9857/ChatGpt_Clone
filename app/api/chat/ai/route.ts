export const maxDuration = 60;
import OpenAI from "openai";
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("API Key loaded:", process.env.OPENAI_API_KEY?.slice(0, 10)); 

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const { chatId, prompt, isEdit, editIndex } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }

    await connectDB();
    const chat = await Chat.findOne({ userId, _id: chatId });

    if (!chat) {
      return NextResponse.json({ success: false, message: "Chat not found" });
    }

    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now()
    };

    if (isEdit && typeof editIndex === 'number') {
      // Handle edit: Replace the message at editIndex and remove subsequent messages
      chat.messages = chat.messages.slice(0, editIndex);
      chat.messages.push(userPrompt);
    } else {
      // Handle new message: Add to the end
      chat.messages.push(userPrompt);
    }

    // Build conversation context for OpenAI
    const conversationMessages = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const completion = await openai.chat.completions.create({
      messages: conversationMessages,
      model: "gpt-3.5-turbo",  
      stream: false
    });

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