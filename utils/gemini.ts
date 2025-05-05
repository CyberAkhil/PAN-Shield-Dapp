import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Read API key from external file
const apiKeyPath = path.join(process.cwd(), 'utils', 'geminiAPI.txt');
const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();

const genAI = new GoogleGenerativeAI(apiKey);

export async function getChatResponse(message: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemPrompt = `You are a helpful assistant for the PAN Shield application, which is a blockchain-based PAN card verification system. 
    Help users with:
    - PAN Registration: Guide on secure PAN registration process
    - Address Verification: Explain how to check wallet addresses
    - Suspicious Address Reporting: Guide through the reporting process
    - Blockchain Security: Explain our security measures
    - General Support: Help with basic queries

    If the query is not related to PAN Shield, politely redirect to relevant features.
    If you don't understand or can't help, suggest contacting support@panshield.com

    Keep responses concise, friendly, and focused on PAN Shield features.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: message }
    ]);

    const response = await result.response;
    const responseText = response.text();

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return responseText;
  } catch (error: any) {
    console.error('Error in Gemini API:', error);
    
    // Handle specific error types
    if (error.message?.includes('quota exceeded')) {
      return "I apologize, but our AI service is currently at capacity. Please try again in a few minutes or contact support@panshield.com for immediate assistance.";
    }
    
    if (error.message?.includes('network')) {
      return "I'm having trouble connecting to our AI service due to network issues. Please check your internet connection and try again.";
    }

    if (error.message?.includes('invalid')) {
      return "I encountered an error processing your request. Please try rephrasing your question or contact our support team.";
    }

    // Default error message
    return "I apologize, but I'm having trouble processing your request right now. You can:\n1. Try again in a few moments\n2. Contact support at support@panshield.com\n3. Try using our helpline";
  }
} 