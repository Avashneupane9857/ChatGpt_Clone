# ChatGPT Clone

A pixel-perfect (jk), fully-functional ChatGPT clone built with modern web technologies, featuring advanced AI capabilities, file upload support, and seamless user experience.

## 🚀 Features

### Core Chat Interface (UI/UX)
- **Pixel-perfect ChatGPT UI** - Exact replication of layout, spacing, fonts, animations, and scrolling behavior
- **Fully responsive design** with mobile accessibility (ARIA-compliant)
- **Message editing** - Edit previously submitted messages with seamless regeneration
- **Real-time chat** with smooth UI updates and graceful loading states

### AI-Powered Chat Functionality
- **Vercel AI SDK Integration** - Advanced chat responses with streaming capabilities
- **Context window handling** - Intelligent message history management for models with limited context
- **Message streaming** - Real-time response generation with graceful UI updates
- **Multiple AI model support** - Token limits managed per model constraints (GPT-4 Turbo, etc.)

### Advanced Capabilities
- **Chat Memory** - Persistent conversation context using advanced memory systems
- **File & Image Upload Support**:
  - Images (PNG, JPG, JPEG, WebP)
  - Secure cloud storage integration
- **Message Management** - Edit, delete, and regenerate messages
- **Conversation History** - Persistent chat sessions with search capabilities

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and transitions
- **Vercel AI SDK** - AI chat functionality

### Backend
- **Node.js/Next.js API Routes** - Serverless backend functions
- **MongoDB** - Database for chat history and user data
- **Vercel AI SDK** - AI model integration
- **Clerk Authentication** - Secure user sessions

### Cloud Services
- **Vercel** - Deployment platform
- **Cloudinary** - File and image storage
- **MongoDB Atlas** - Cloud database

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- pnpm
- MongoDB database
- Vercel account (for deployment)
- OpenAI API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Avashneupane9857
   cd chatgpt-clone
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   MEM0AI_KEY=your_mem0ai_key
   
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # File Storage
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Authentication
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_signing_secret
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Environment Variables**
   Add all environment variables from `.env.local` to your Vercel project settings

3. **Deploy**
   Vercel will automatically deploy on every push to main branch

## 🙏 Acknowledgments

- OpenAI for the GPT API
- Vercel for the AI SDK and deployment platform
- The Next.js team for the excellent framework
- Contributors and the open-source community

---