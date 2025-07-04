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
       
        const {chatId,name}=await req.json();
          await connectDB()
        await Chat.findOneAndUpdate({_id:chatId,userId},{name})
        return NextResponse.json({success:true ,message:"Chat renamed"})
    }catch(error){
return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        });
    }
    
}