/* eslint-disable @typescript-eslint/no-explicit-any */
export const maxDuration = 60;
import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { uploadToCloudinary } from "../../../../config/cloudinary";
import MemoryClient from 'mem0ai';

const memoryClient = new MemoryClient({ 
  apiKey: process.env.MEM0AI_KEY || ""
});

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
  timestamp?: number;
  files?: UploadedFile[];
}

interface MessageContent {
  type: string;
  text?: string;
  image?: string;
}

interface Memory {
  id?: string;
  text?: string;
  content?: string;
  score?: number;
}

const addMemories = async (messages: ChatMessage[], userId: string) => {
  try {
    const memoryMessages = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : 
               Array.isArray(msg.content) ? 
               msg.content.map(c => c.text || c.type).join(' ') : 
               String(msg.content)
    }));
    
    const result = await memoryClient.add(memoryMessages, { user_id: userId });
    console.log('Memory added:', result);
    return result;
  } catch (error) {
    console.error('Error adding memories:', error);
    throw error;
  }
};

const searchMemories = async (query: string, userId: string): Promise<Memory[]> => {
  try {
    const results = await memoryClient.search(query, { user_id: userId });
    console.log('Memory search results:', results);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('Error searching memories:', error);
    return [];
  }
};

const getMemoryContext = async (prompt: string, userId: string) => {
  try {
    const memories = await searchMemories(prompt, userId);
    
    if (memories && memories.length > 0) {
      const memoryContext = memories.map((memory: Memory) => 
        memory.text || memory.content || ''
      ).filter(Boolean).join('\n');
      
      return memoryContext ? `Based on our previous conversations, here's what I remember about you:\n${memoryContext}\n\nNow, regarding your current question:\n` : '';
    }
    
    return '';
  } catch (error) {
    console.error('Error getting memory context:', error);
    return '';
  }
};

const uploadFilesToCloudinary = async (files: UploadedFile[]) => {
  const uploadPromises = files.map(async (file) => {
    try {
      let fileBuffer;
      
      if (file.type.startsWith('image/')) {
        const base64Data = file.content.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
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

const createMessagesWithFiles = (messages: ChatMessage[]): any[] => {
  return messages.map(msg => {
    if (msg.role === 'user' && msg.files && msg.files.length > 0) {
      let content = typeof msg.content === 'string' ? msg.content : 
                   Array.isArray(msg.content) ? 
                   msg.content.map(c => c.text || '').join(' ') : 
                   String(msg.content);
      
      const messageContent: MessageContent[] = [];
      
      messageContent.push({
        type: "text",
        text: content
      });

      msg.files.forEach((file: UploadedFile) => {
        if (file.type.startsWith('image/')) {
          messageContent.push({
            type: "image",
            image: file.cloudinaryUrl || file.content
          });
        } else {
          content += `\n\n${processFileContent(file)}`;
        }
      });
      
      return {
        role: msg.role,
        content: messageContent.length > 1 ? messageContent : content
      };
    }
    
    return {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : 
               Array.isArray(msg.content) ? 
               msg.content.map(c => c.text || '').join(' ') : 
               String(msg.content)
    };
  });
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const { chatId, prompt, files = [], isEdit, editIndex, stream = false } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }

    await connectDB();
    const chat = await Chat.findOne({ userId, _id: chatId });
    
    if (!chat) {
      return NextResponse.json({ success: false, message: "Chat not found" });
    }

    let uploadedFiles: UploadedFile[] = [];
    if (files.length > 0) {
      try {
        uploadedFiles = await uploadFilesToCloudinary(files);
      } catch (error) {
        console.error('Error uploading files:', error);
        return NextResponse.json({ 
          success: false, 
          message: "Failed to upload files to Cloudinary" 
        });
      }
    }

    const memoryContext = await getMemoryContext(prompt, userId);

    let userContent = prompt;
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((file: UploadedFile) => {
        if (!file.type.startsWith('image/')) {
          userContent += `\n\n${processFileContent(file)}`;
        }
      });
    }

    const userPrompt: ChatMessage = {
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      files: uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content, 
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

    const conversationMessages = createMessagesWithFiles(chat.messages);
    
    if (memoryContext && conversationMessages.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage.role === 'user') {
        if (typeof lastMessage.content === 'string') {
          lastMessage.content = memoryContext + lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
          const textContent = lastMessage.content.find((c: any) => c.type === 'text');
          if (textContent) {
            textContent.text = memoryContext + textContent.text;
          }
        }
      }
    }

    const hasImages = uploadedFiles.some((file: UploadedFile) => file.type.startsWith('image/'));
    const model = hasImages ? "gpt-4o" : "gpt-3.5-turbo";

    if (stream) {
      const result = await streamText({
        model: openai(model),
        messages: conversationMessages,
        maxTokens: hasImages ? 1000 : undefined,
      });

      // Enhanced streaming with better performance
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let fullContent = '';
          
          try {
            for await (const chunk of result.textStream) {
              fullContent += chunk;
              
              // Send each chunk immediately as it arrives
              const data = JSON.stringify({ 
                content: chunk, // Send only the new chunk
                fullContent: fullContent,
                done: false 
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              // Small delay to prevent overwhelming the client
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            const message: ChatMessage = {
              role: "assistant",
              content: fullContent,
              timestamp: Date.now()
            };
            
            chat.messages.push(message);
            await chat.save();

            try {
              await addMemories([userPrompt, message], userId);
            } catch (memoryError) {
              console.error('Failed to add memories:', memoryError);
            }
            
            const finalData = JSON.stringify({ 
              content: '',
              fullContent: fullContent,
              done: true,
              message: message
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = JSON.stringify({ 
              error: error instanceof Error ? error.message : "Unknown error",
              done: true 
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else {
      const result = await generateText({
        model: openai(model),
        messages: conversationMessages,
        maxTokens: hasImages ? 1000 : undefined,
      });

      const message: ChatMessage = {
        role: "assistant",
        content: result.text,
        timestamp: Date.now()
      };

      chat.messages.push(message);
      await chat.save();

      try {
        await addMemories([userPrompt, message], userId);
      } catch (memoryError) {
        console.error('Failed to add memories:', memoryError);
      }

      return NextResponse.json({ success: true, data: message });
    }
  } catch (error) {
    console.error("Error in /api/chat/ai:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}