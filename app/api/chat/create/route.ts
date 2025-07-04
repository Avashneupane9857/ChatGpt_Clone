import connectDB from "@/config/db";
import Chat from "@/models/Chat";


import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req:NextRequest) {
    try{
        const {userId}=getAuth(req)
        if(!userId){
            return NextResponse.json({success:false,message:"User not authenciated"})
        }
        const chatData={
            userId,
            messages:[],
            name:"New Chat"
        }
        await connectDB()
        await Chat.create(chatData);
        return NextResponse.json({success:true,data:"chat rendered"})

    }catch(error){
return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        });
    }
    
}