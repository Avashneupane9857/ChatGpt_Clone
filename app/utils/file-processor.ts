/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import mammoth from 'mammoth';
import { pdfToText } from 'pdf-ts';

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

interface ProcessedFile {
  text: string;
  summary?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    fileType: string;
  };
}

export class FileProcessor {
  private static instance: FileProcessor;

  constructor() {
    // No special initialization needed for pdf-ts
  }

  static getInstance(): FileProcessor {
    if (!FileProcessor.instance) {
      FileProcessor.instance = new FileProcessor();
    }
    return FileProcessor.instance;
  }

  // Enhanced file validation with better error messages
  private validateFile(file: UploadedFile): void {
    console.log('Validating file:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      hasContent: !!file?.content,
      contentType: typeof file?.content,
      contentLength: file?.content?.length || 0
    });

    if (!file) {
      throw new Error('File object is null or undefined');
    }

    if (!file.name || typeof file.name !== 'string') {
      throw new Error(`File name is missing or invalid. Received: ${typeof file.name}`);
    }

    if (!file.type || typeof file.type !== 'string') {
      throw new Error(`File type is missing or invalid. Received: ${typeof file.type}`);
    }

    if (file.content === null || file.content === undefined) {
      throw new Error(`File content is missing. File: ${file.name}, Content: ${file.content}`);
    }

    if (typeof file.content !== 'string') {
      throw new Error(`File content must be a string. File: ${file.name}, Content type: ${typeof file.content}`);
    }

    if (file.content.trim() === '') {
      throw new Error(`File content is empty. File: ${file.name}`);
    }

    console.log('File validation passed for:', file.name);
  }

  // Enhanced base64 extraction with better error handling
  private extractBase64Data(content: string, fileName: string): string {
    console.log(`Extracting base64 data for ${fileName}...`);
    
    if (!content || typeof content !== 'string') {
      throw new Error(`Invalid content provided for base64 extraction. File: ${fileName}`);
    }

    // Check if content contains data URL prefix
    if (content.includes('data:')) {
      const parts = content.split(',');
      if (parts.length < 2) {
        throw new Error(`Invalid data URL format. File: ${fileName}`);
      }
      const base64Data = parts[1];
      console.log(`Extracted base64 data length: ${base64Data.length} for ${fileName}`);
      return base64Data;
    }

    // Check if content is already base64
    if (content.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      console.log(`Content appears to be base64 already for ${fileName}`);
      return content;
    }

    // If content doesn't look like base64, try to extract it anyway
    console.log(`Content doesn't appear to be base64, using as-is for ${fileName}`);
    return content;
  }

  async processFile(file: UploadedFile): Promise<string> {
    try {
      // Validate file before processing
      this.validateFile(file);
      
      console.log(`Processing file: ${file.name}, type: ${file.type}, content length: ${file.content?.length || 0}`);
      
      const processed = await this.extractContent(file);
      return this.formatOutput(file, processed);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      
      // Return a more user-friendly error message instead of throwing
      return `[Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private async extractContent(file: UploadedFile): Promise<ProcessedFile> {
    const fileType = file.type.toLowerCase();
    
    console.log(`Extracting content for file type: ${fileType}`);
    
    if (fileType.includes('pdf')) {
      return await this.processPDF(file);
    } else if (fileType.includes('word') || fileType.includes('document') || fileType.includes('officedocument')) {
      return await this.processWord(file);
    } else if (fileType.includes('text') || fileType.includes('plain')) {
      return await this.processText(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async processPDF(file: UploadedFile): Promise<ProcessedFile> {
    console.log(`Processing PDF: ${file.name}`);
    
    try {
      // Extract base64 data safely
      const base64Data = this.extractBase64Data(file.content, file.name);
      
      if (!base64Data) {
        throw new Error('Failed to extract base64 data from PDF content');
      }

      // Convert base64 to buffer with error handling
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
        console.log(`PDF buffer created, size: ${buffer.length} bytes`);
      } catch (bufferError) {
        console.error('Buffer creation error:', bufferError);
        throw new Error(`Failed to convert base64 to buffer: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`);
      }

      if (buffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }

      // Process PDF using pdf-ts with timeout
      console.log('Parsing PDF document with pdf-ts...');
      
      const extractedText = await Promise.race([
        pdfToText(buffer),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('PDF parsing timeout after 30 seconds')), 30000)
        )
      ]);
      
      const fullText = extractedText || '';
      
      console.log(`PDF processed successfully with pdf-ts. Text length: ${fullText.length}`);
      
      if (fullText.length === 0) {
        console.warn('No text extracted from PDF - might be image-based or encrypted');
      }
      
      // Count pages by looking for page breaks or estimate based on content
      const estimatedPages = Math.max(1, Math.ceil(fullText.length / 3000)); // Rough estimate
      
      return {
        text: fullText.trim() || '[No text content found in PDF - document may be image-based or encrypted]',
        summary: this.generateSummary(fullText),
        metadata: {
          pages: estimatedPages,
          wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
          fileType: 'PDF'
        }
      };
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Return a more graceful error message
      return {
        text: `[Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        summary: 'PDF processing failed',
        metadata: {
          pages: 0,
          wordCount: 0,
          fileType: 'PDF (Error)'
        }
      };
    }
  }

  private async processWord(file: UploadedFile): Promise<ProcessedFile> {
    console.log(`Processing Word document: ${file.name}`);
    
    try {
      // Extract base64 data safely
      const base64Data = this.extractBase64Data(file.content, file.name);
      
      if (!base64Data) {
        throw new Error('Failed to extract base64 data from Word document content');
      }

      // Convert base64 to buffer
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
        console.log(`Word buffer created, size: ${buffer.length} bytes`);
      } catch (bufferError) {
        console.error('Buffer creation error:', bufferError);
        throw new Error(`Failed to convert base64 to buffer: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`);
      }

      if (buffer.length === 0) {
        throw new Error('Word document buffer is empty');
      }
      
      // Extract text using mammoth with timeout
      console.log('Extracting text from Word document...');
      const result = await Promise.race([
        mammoth.extractRawText({ buffer }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Word processing timeout')), 30000)
        )
      ]) as any;
      
      const text = result.value || '';
      console.log(`Word processing complete. Text length: ${text.length}`);
      
      return {
        text: text.trim() || '[No text content found in Word document]',
        summary: this.generateSummary(text),
        metadata: {
          wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
          fileType: 'Word Document'
        }
      };
    } catch (error) {
      console.error('Error processing Word document:', error);
      throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processText(file: UploadedFile): Promise<ProcessedFile> {
    try {
      // Validate file content
      if (!file.content || typeof file.content !== 'string') {
        throw new Error(`Invalid or missing content for text file: ${file.name}`);
      }

      // Extract base64 data safely
      const base64Data = this.extractBase64Data(file.content, file.name);
      
      if (!base64Data) {
        throw new Error('Failed to extract base64 data from text file content');
      }

      // Convert base64 to text
      let text: string;
      try {
        text = Buffer.from(base64Data, 'base64').toString('utf-8');
      } catch (bufferError) {
        throw new Error(`Failed to convert base64 to text: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`);
      }
      
      return {
        text: text.trim() || '[No text content found in file]',
        summary: this.generateSummary(text),
        metadata: {
          wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
          fileType: 'Text File'
        }
      };
    } catch (error) {
      console.error('Error processing text file:', error);
      throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSummary(text: string): string {
    if (!text || typeof text !== 'string') {
      return 'No content available for summary';
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return 'No content available for summary';
    }

    const words = trimmedText.split(/\s+/).filter(word => word.length > 0);
    const sentences = trimmedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return trimmedText.substring(0, 200) + (trimmedText.length > 200 ? '...' : '');
    }
    
    if (sentences.length <= 2) {
      return trimmedText.substring(0, 200) + (trimmedText.length > 200 ? '...' : '');
    }
    
    // Return first 2 sentences as summary
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private formatOutput(file: UploadedFile, processed: ProcessedFile): string {
    const { text, summary, metadata } = processed;
    
    let output = `[File: ${file.name}]\n`;
    
    if (metadata) {
      output += `Type: ${metadata.fileType}\n`;
      if (metadata.pages) {
        output += `Pages: ${metadata.pages}\n`;
      }
      if (metadata.wordCount) {
        output += `Word Count: ${metadata.wordCount}\n`;
      }
    }
    
    if (summary) {
      output += `\nSummary: ${summary}\n`;
    }
    
    output += `\nContent:\n${text}`;
    
    return output;
  }
}

// Export singleton instance
export const fileProcessor = FileProcessor.getInstance();