/* eslint-disable @typescript-eslint/no-explicit-any */
export const maxDuration = 60;

import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { uploadToCloudinary } from "@/config/cloudinary";
import MemoryClient from 'mem0ai';
import { fileProcessor } from '../../../utils/file-processor';

// Initialize Memory Client
const memoryClient = new MemoryClient({ 
  apiKey: process.env.MEM0AI_KEY || ""
});

// Type Definitions
interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  processedContent?: string; // Add this to store processed content
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  uploadedAt?: Date;
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
  memory?: string;
}

// Helper function to ensure content is always a string for database storage
const normalizeMessageContent = (content: string | MessageContent[]): string => {
  if (typeof content === 'string') {
    return content || '[Empty message]';
  }
  
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (item.type === 'text') {
          return item.text || '';
        } else if (item.type === 'image') {
          return '[Image]';
        }
        return '';
      })
      .join(' ')
      .trim() || '[Empty message]';
  }
  
  return '[Invalid message content]';
};

// Validate message before saving
const validateMessage = (message: ChatMessage): ChatMessage => {
  const normalizedContent = normalizeMessageContent(message.content);
  
  return {
    ...message,
    content: normalizedContent,
    timestamp: message.timestamp || Date.now(),
    role: message.role || 'user'
  };
};

// File Processing Function - Fixed to handle file validation properly
async function processFileContent(file: UploadedFile): Promise<string> {
  try {
    // Check if already processed
    if (file.processedContent) {
      console.log(`Using cached processed content for file: ${file.name}`);
      return file.processedContent;
    }

    // Add detailed logging for debugging
    console.log(`Processing file: ${file.name}`);
    console.log(`File type: ${file.type}`);
    console.log(`File size: ${file.size}`);
    console.log(`Content exists: ${!!file.content}`);
    console.log(`Content type: ${typeof file.content}`);
    console.log(`Content length: ${file.content?.length || 0}`);
    
    // Validate file object has required properties
    if (!file || typeof file !== 'object') {
      throw new Error('Invalid file object provided');
    }
    
    if (!file.name || !file.type || !file.content) {
      throw new Error(`Missing required file properties: name=${!!file.name}, type=${!!file.type}, content=${!!file.content}`);
    }
   
    const processed = await fileProcessor.processFile(file);
    // Cache the processed content
    file.processedContent = processed;
    return processed;
  } catch (error) {
    console.error('Error processing file:', error);
    return `Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Memory Management Functions
const addMemories = async (messages: ChatMessage[], userId: string) => {
  try {
    const memoryMessages = messages.map(msg => ({
      role: msg.role,
      content: normalizeMessageContent(msg.content)
    }));
    console.log('Saving to memory:', { userId, memoryMessages });
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
    console.log('Memory search for prompt:', prompt, 'userId:', userId, 'results:', memories);
    if (memories && memories.length > 0) {
      // Use .memory field if present, fallback to .text or .content
      const memoryContext = memories.map((memory: Memory) => 
        memory.memory || memory.text || memory.content || ''
      ).filter(Boolean).join('\n');
      return memoryContext ? `Based on our previous conversations, here's what I remember about you:\n${memoryContext}\n\nNow, regarding your current question:\n` : '';
    }
    return '';
  } catch (error) {
    console.error('Error getting memory context:', error);
    return '';
  }
};

// Process files and cache the results
const processAndCacheFiles = async (files: UploadedFile[]): Promise<UploadedFile[]> => {
  const processedFiles = [];
  
  for (const file of files) {
    // Skip processing if image and already has cloudinaryUrl (editing case)
    if (file.type.startsWith('image/') && file.cloudinaryUrl) {
      processedFiles.push(file);
      continue;
    }
    // Robust: If file has cloudinaryUrl but no content (already uploaded, e.g. PDF), skip processing
    if (!file.type.startsWith('image/') && file.cloudinaryUrl && !file.content) {
      processedFiles.push(file);
      continue;
    }
    if (!file.type.startsWith('image/')) {
      console.log(`Pre-processing file: ${file.name}`);
      try {
        const processedContent = await processFileContent(file);
        processedFiles.push({
          ...file,
          processedContent
        });
      } catch (error) {
        console.error(`Error pre-processing file ${file.name}:`, error);
        processedFiles.push({
          ...file,
          processedContent: `Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    } else {
      processedFiles.push(file);
    }
  }
  
  return processedFiles;
};

// File Upload Functions
const uploadFilesToCloudinary = async (files: UploadedFile[]): Promise<UploadedFile[]> => {
  const uploadPromises = files.map(async (file) => {
    try {
      // If the file already has a cloudinaryUrl, skip re-uploading (robust for all file types)
      if (file.cloudinaryUrl) {
        return file;
      }
      let fileBuffer;
      if (file.type.startsWith('image/')) {
        const base64Data = file.content.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        fileBuffer = Buffer.from(file.content, 'utf8');
      }
      const { url, publicId } = await uploadToCloudinary(fileBuffer, file.name, file.type);
      // Return the file with cloudinary info but preserve original content
      return {
        ...file,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId,
        // Keep original content for processing
        content: file.content
      };
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}`);
    }
  });
  return Promise.all(uploadPromises);
};

// Fixed createMessagesWithFiles function
const createMessagesWithFiles = async (messages: ChatMessage[]): Promise<any[]> => {
  const processedMessages = [];
  for (const msg of messages) {
    if (msg.role === 'user' && msg.files && msg.files.length > 0) {
      // Combine user prompt and all non-image processedContent into one text block
      let combinedText = normalizeMessageContent(msg.content);
      for (const file of msg.files) {
        if (!file.type.startsWith('image/') && file.processedContent) {
          combinedText += `\n\n[${file.name} Content]\n${file.processedContent}`;
        }
      }
      const messageContent: MessageContent[] = [];
      if (combinedText.trim()) {
        messageContent.push({ type: 'text', text: combinedText.trim() });
      }
      // Add all images
      for (const file of msg.files) {
        if (file.type.startsWith('image/')) {
          messageContent.push({
            type: 'image',
            image: file.cloudinaryUrl || file.content
          });
        }
      }
      if (messageContent.length === 0) {
        messageContent.push({ type: 'text', text: '[File uploaded]' });
      }
      processedMessages.push({
        role: msg.role,
        content: messageContent
      });
    } else {
      const normalizedContent = normalizeMessageContent(msg.content);
      processedMessages.push({
        role: msg.role,
        content: normalizedContent
      });
    }
  }
  return processedMessages;
};

// Main POST Handler
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const { chatId, prompt, files = [], isEdit, editIndex, stream = false } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ 
        success: false, 
        message: "Prompt is required and must be a non-empty string" 
      });
    }

    await connectDB();
    const chat = await Chat.findOne({ userId, _id: chatId });
    
    if (!chat) {
      return NextResponse.json({ success: false, message: "Chat not found" });
    }

    // Process files BEFORE uploading to Cloudinary
    let processedFiles: UploadedFile[] = [];
    if (files.length > 0) {
      try {
        console.log('Pre-processing files...');
        processedFiles = await processAndCacheFiles(files);
        console.log('Files pre-processed successfully');
        console.log('Uploading files to Cloudinary...');
        processedFiles = await uploadFilesToCloudinary(processedFiles);
        console.log('Files uploaded successfully:', processedFiles.map(f => f.name));
      } catch (error) {
        console.error('Error processing/uploading files:', error);
        // Collect file-specific errors if available
        let errorMsg = 'Failed to process or upload files.';
        if (error instanceof Error && error.message) {
          errorMsg += ' Details: ' + error.message;
        }
        return NextResponse.json({ 
          success: false, 
          error: errorMsg
        });
      }
    }

    const hasImages = processedFiles.some((file: UploadedFile) => file.type.startsWith('image/'));
    const model = "gpt-4o";

    const memoryContext = await getMemoryContext(prompt, userId);

    // Keep user content clean for display (only original prompt)
    let userContentForDisplay = prompt.trim();
    
    // Add file references for display (not full content)
    if (processedFiles && processedFiles.length > 0) {
      const nonImageFiles = processedFiles.filter(file => !file.type.startsWith('image/'));
      if (nonImageFiles.length > 0) {
        const fileRefs = nonImageFiles.map(file => `[File: ${file.name}]`).join(', ');
        userContentForDisplay += `\n\n${fileRefs}`;
      }
    }

    // Create separate content for AI processing (with full file content)
    let userContentForAI = prompt.trim();
    
    // Add processed content from non-image files for AI processing
    if (processedFiles && processedFiles.length > 0) {
      const nonImageFiles = processedFiles.filter(file => !file.type.startsWith('image/'));
      if (nonImageFiles.length > 0) {
        console.log('Adding processed content from non-image files for AI processing...');
        for (const file of nonImageFiles) {
          if (file.processedContent) {
            userContentForAI += `\n\n${file.processedContent}`;
          } else {
            console.warn(`No processed content for file ${file.name}`);
            userContentForAI += `\n\n[File ${file.name} was uploaded but content could not be processed]`;
          }
        }
      }
    }

    // Ensure content is not empty
    if (!userContentForDisplay.trim()) {
      userContentForDisplay = '[Empty message with files]';
    }
    if (!userContentForAI.trim()) {
      userContentForAI = '[Empty message with files]';
    }

    
    const userPrompt: ChatMessage = {
      role: "user",
      content: userContentForDisplay, 
      timestamp: Date.now(),
      files: processedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
        processedContent: file.processedContent, 
        cloudinaryUrl: file.cloudinaryUrl,
        cloudinaryPublicId: file.cloudinaryPublicId,
        uploadedAt: new Date()
      }))
    };


    const validatedUserPrompt = validateMessage(userPrompt);

    if (isEdit && typeof editIndex === 'number') {
      // Remove all messages after the edited user message (including any old assistant responses)
      chat.messages = chat.messages.slice(0, editIndex + 1);
      chat.messages[editIndex] = validatedUserPrompt;
    } else {
      chat.messages.push(validatedUserPrompt);
    }

    if (chat.name === "New chat" && prompt && typeof prompt === "string") {
      const words = prompt.trim().split(/\s+/).slice(0, 2).join(" ");
      chat.name = words || "New chat";
    }

    await chat.save();

    const conversationMessages = await createMessagesWithFiles(chat.messages);
    
    // If using gpt-3.5-turbo, ensure all message contents are strings
    // if (model === 'gpt-3.5-turbo') {
    //   for (let i = 0; i < conversationMessages.length; i++) {
    //     if (typeof conversationMessages[i].content !== 'string') {
    //       conversationMessages[i].content = normalizeMessageContent(conversationMessages[i].content);
    //     }
    //   }
    // }

    // Combine memory context and user prompt for the last user message
    if (conversationMessages.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage.role === 'user') {
        const finalContent = (memoryContext || '') + userContentForAI;
        if (typeof lastMessage.content === 'string') {
          lastMessage.content = finalContent;
        } else if (Array.isArray(lastMessage.content)) {
          const textContent = lastMessage.content.find((c: any) => c.type === 'text');
          if (textContent) {
            textContent.text = finalContent;
          }
        }
      }
    }

    // LOG the final payload sent to the model for debugging
    console.log('=== FINAL conversationMessages SENT TO MODEL ===');
    console.dir(conversationMessages, { depth: null });
    console.log('==============================================');

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
              
              
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            
            const finalContent = fullContent.trim() || '[Empty response]';
            
            const message: ChatMessage = {
              role: "assistant",
              content: finalContent,
              timestamp: Date.now()
            };
            
      
            const validatedMessage = validateMessage(message);
            
   
            chat.messages.push(validatedMessage);
            

            try {
              await chat.save();
              console.log('Chat saved successfully');
            } catch (saveError) {
              console.error('Error saving chat:', saveError);
              // Log details about the messages that failed validation
              console.log('Messages with validation issues:', 
                chat.messages.map((msg: ChatMessage, index: number) => ({
                  index,
                  role: msg.role,
                  contentType: typeof msg.content,
                  contentLength: (msg.content as string)?.length || 0,
                  hasContent: !!msg.content
                }))
              );
              throw saveError;
            }

            // Try to add memories, but don't fail if this fails
            try {
              await addMemories([validatedUserPrompt, validatedMessage], userId);
            } catch (memoryError) {
              console.error('Failed to add memories:', memoryError);
            }
            
            const finalData = JSON.stringify({ 
              content: '',
              fullContent: finalContent,
              done: true,
              message: validatedMessage,
              updatedChat: isEdit ? chat : undefined
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            
          } catch (error) {
            console.error('Streaming error:', error);
            let errorMsg = 'Streaming error.';
            if (error instanceof Error && error.message) {
              errorMsg += ' Details: ' + error.message;
            }
            const errorData = JSON.stringify({ 
              error: errorMsg,
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


      const finalContent = result.text.trim() || '[Empty response]';

      const message: ChatMessage = {
        role: "assistant",
        content: finalContent,
        timestamp: Date.now()
      };

    
      const validatedMessage = validateMessage(message);

      chat.messages.push(validatedMessage);
      
      try {
        await chat.save();
      } catch (saveError) {
        console.error('Error saving chat:', saveError);
        console.log('Messages with validation issues:', 
          chat.messages.map((msg: ChatMessage, index: number) => ({
            index,
            role: msg.role,
            contentType: typeof msg.content,
            contentLength: (msg.content as string)?.length || 0,
            hasContent: !!msg.content
          }))
        );
        throw saveError;
      }

      try {
        await addMemories([validatedUserPrompt, validatedMessage], userId);
      } catch (memoryError) {
        console.error('Failed to add memories:', memoryError);
      }

      return NextResponse.json({ success: true, data: validatedMessage, updatedChat: isEdit ? chat : undefined });
    }
  } catch (error) {
    console.error("Error in /api/chat/ai:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}