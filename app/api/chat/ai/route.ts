export const maxDuration=60;
import OpenAI from "openai";
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/config/db";
import Chat from "@/models/Chat";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
console.log("API Key loaded:", process.env.OPENAI_API_KEY?.slice(0, 10)); 

export async function POST(req:NextRequest){
    try{
        const {userId}=getAuth(req)
        const {chatId,prompt}=await req.json()
     if(!userId){
            return NextResponse.json({success:false,message:"User not authenciated"})
        }
        await connectDB();
        const data=await Chat.findOne({userId,_id:chatId})
        const userPrompt={
            role:"user",
            content:prompt,
            timestamp:Date.now()
        }
        data.messages.push(userPrompt)
   const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",  
            stream: false
        });
    const rawMessage = completion.choices[0].message;
const message = {
  ...rawMessage,
  timestamp: Date.now()
};

        data.messages.push(message);
        console.log(message)
        await data.save();
           return NextResponse.json({ success: true, data: message }); 
    }catch(error){
        console.log("i am herer in catch of /ai")
          console.error(error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        });
    }
}


// for full conversation history 

// export const maxDuration = 60; // Fixed: should be positive number

// import OpenAI from "openai";
// import { getAuth } from "@clerk/nextjs/server";
// import { NextRequest, NextResponse } from "next/server";
// import Chat from "@/models/chat";
// import connectDB from "@/config/db";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// export async function POST(req: NextRequest) {
//     try {
//         const { userId } = getAuth(req);
//         const { chatId, prompt } = await req.json();
        
//         if (!userId) {
//             return NextResponse.json({ 
//                 success: false, 
//                 message: "User not authenticated" 
//             });
//         }

//         await connectDB();
//         const data = await Chat.findOne({ userId, _id: chatId });
        
//         if (!data) {
//             return NextResponse.json({ 
//                 success: false, 
//                 message: "Chat not found" 
//             });
//         }

//         const userPrompt = {
//             role: "user",
//             content: prompt,
//             timestamp: Date.now()
//         };
        
//         data.messages.push(userPrompt);

//         // Use the full conversation history for better context
//         const messages = data.messages.map(msg => ({
//             role: msg.role,
//             content: msg.content
//         }));

//         const completion = await openai.chat.completions.create({
//             messages: messages, // Use full conversation history
//             model: "gpt-4o",
//             stream: false
//         });

//         const rawMessage = completion.choices[0].message;
//         const message = {
//             ...rawMessage,
//             timestamp: Date.now()
//         };

//         data.messages.push(message);
//         await data.save();

//         return NextResponse.json({ success: true, data: message });
        
//     } catch (error) {
//         console.error("Chat API Error:", error);
//         return NextResponse.json({ 
//             success: false, 
//             error: error instanceof Error ? error.message : "Unknown error occurred" 
//         });
//     }
// }