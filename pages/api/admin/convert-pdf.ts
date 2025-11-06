import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import { createCanvas, Canvas } from 'canvas';
import { createClient } from '@supabase/supabase-js';
import { isAuthorizedAdminRequest } from '../../../lib/auth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConvertPdfResponse {
  success: boolean;
  images?: string[];
  error?: string;
  details?: string;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow larger PDF files
    },
  },
};

async function pdfPageToImage(pdfBytes: Uint8Array, pageIndex: number): Promise<Buffer> {
  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdfDocument = await loadingTask.promise;
    
    // Get specific page
    const page = await pdfDocument.getPage(pageIndex + 1); // Pages are 1-indexed
    
    // Set scale for good quality
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context as any,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to PNG buffer
    return canvas.toBuffer('image/png');
    
  } catch (error) {
    console.error('[PDF Convert] Error converting page to image:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConvertPdfResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check admin authorization
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { pdfBase64, filename } = req.body;

    if (!pdfBase64 || !filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: pdfBase64 and filename' 
      });
    }

    console.log(`[PDF Convert] Starting conversion for: ${filename}`);

    // Decode base64 PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`[PDF Convert] PDF has ${pageCount} page(s)`);

    if (pageCount === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'PDF has no pages' 
      });
    }

    // Convert each page to image
    const uploadedImages: string[] = [];
    const baseFilename = filename.replace(/\.pdf$/i, '');

    for (let i = 0; i < pageCount; i++) {
      console.log(`[PDF Convert] Converting page ${i + 1}/${pageCount}`);
      
      try {
        // Convert page to image buffer
        const imageBuffer = await pdfPageToImage(pdfBuffer, i);
        
        // Generate filename for this page
        const imageFilename = pageCount > 1 
          ? `${baseFilename}-page-${i + 1}.png`
          : `${baseFilename}.png`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('slideshow-images')
          .upload(imageFilename, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error(`[PDF Convert] Upload error for page ${i + 1}:`, uploadError);
          throw new Error(`Failed to upload page ${i + 1}: ${uploadError.message}`);
        }

        console.log(`[PDF Convert] ✅ Uploaded: ${imageFilename}`);
        uploadedImages.push(imageFilename);

        // Insert metadata into database
        const { error: dbError } = await supabase
          .from('image_durations')
          .upsert({
            filename: imageFilename,
            duration_ms: 5000, // Default 5 seconds
            caption: `PDF: ${baseFilename} - Page ${i + 1}`,
            order_index: 999 + i, // Put at end
            hidden: false,
            is_video: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'filename',
          });

        if (dbError) {
          console.error(`[PDF Convert] Database error for page ${i + 1}:`, dbError);
          // Don't throw, continue with other pages
        }

      } catch (pageError) {
        console.error(`[PDF Convert] Error processing page ${i + 1}:`, pageError);
        // Continue with other pages
      }
    }

    console.log(`[PDF Convert] ✅ Conversion complete: ${uploadedImages.length}/${pageCount} pages`);

    return res.status(200).json({
      success: true,
      images: uploadedImages,
    });

  } catch (error) {
    console.error('[PDF Convert] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'PDF conversion failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
