import connectDB from "@/config/db";
import Chat from "@/models/Chat";


import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req:NextRequest) {
    try{
        const {userId}=getAuth(req)
        const{chatId}=await req.json();
        if(!userId){
            return NextResponse.json({success:false,message:"User not authenciated"})
        }
    await connectDB();
    await Chat.deleteOne({_id:chatId,userId})
    return NextResponse.json({success:true,message:"chat deleted"})

    }catch(error){
return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        });
    }
    
}