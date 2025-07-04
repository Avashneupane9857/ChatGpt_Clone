import connectDB from "@/config/db";
import Chat from "@/models/Chat";

import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req:NextRequest) {
    try{
        const {userId}=getAuth(req)
        console.log(userId)
        if(!userId){
            return NextResponse.json({success:false,message:"User not authenciated"})
        }
       
        await connectDB()
        const data=await Chat.find({userId})
        return NextResponse.json({success:true,data})
    }catch(error){
return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error occurred" 
        });
    }
    
}