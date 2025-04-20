import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Groq } from 'groq-sdk';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Validate environment variables
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

// Initialize Groq with API key from environment variable
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Store chat histories for different sessions
const chatHistories = new Map<string, ChatMessage[]>();

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    if (!req.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create session ID from cookies
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('chat_session_id')?.value || uuidv4();
    
    // Get or initialize chat history for this session
    let chatHistory = chatHistories.get(sessionId) || [];
    
    // Add user message to history
    const userMessage: ChatMessage = { role: 'user', content: message };
    chatHistory = [...chatHistory, userMessage].slice(-10);
    
    // Update chat history in map
    chatHistories.set(sessionId, chatHistory);

    const systemMessage: ChatMessage = {
      role: 'system',
      content: 'You are a helpful assistant for the PAN Shield application. You help users understand how to use the application for PAN card registration, verification, and reporting suspicious addresses.'
    };

    const completion = await groq.chat.completions.create({
      messages: [systemMessage, ...chatHistory],
      model: 'mixtral-8x7b-32768',
      temperature: 0.5,
      max_tokens: 1024,
    });

    const assistantReply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    // Add assistant response to history
    const assistantMessage: ChatMessage = { role: 'assistant', content: assistantReply };
    chatHistory.push(assistantMessage);
    chatHistories.set(sessionId, chatHistory);

    // Create response with cookie
    const response = NextResponse.json({ reply: assistantReply });
    response.cookies.set('chat_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    return response;

  } catch (error: any) {
    console.error('Chat API Error:', error);
    
    // Return appropriate error response
    if (error.message === 'GROQ_API_KEY is not set in environment variables') {
      return NextResponse.json(
        { error: 'Chat service is not properly configured' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 