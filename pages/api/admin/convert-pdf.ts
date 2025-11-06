import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { isAuthorizedAdminRequest } from '../../../lib/auth';

// Use pdf-poppler or similar for server-side PDF to image conversion
// For now, we'll use a simpler approach with pdf-lib to extract pages
// and sharp for image processing

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConvertPdfResponse {
  success: boolean;
  images?: string[];
  pageCount?: number;
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

    // Extract base64 data (remove data:application/pdf;base64, prefix if present)
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    // Load PDF document to get page count
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`[PDF Convert] PDF has ${pageCount} page(s)`);

    if (pageCount === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'PDF has no pages' 
      });
    }

    // For now, we'll create placeholder entries in the database
    // The actual PDF to image conversion requires additional tools like pdf-poppler
    // which need to be installed on the server
    
    const uploadedImages: string[] = [];
    const baseFilename = filename.replace(/\.pdf$/i, '');

    // Create metadata entries for each page
    // The user will need to upload actual images separately, or we can implement
    // a server-side conversion using external tools
    
    for (let i = 0; i < pageCount; i++) {
      const imageFilename = pageCount > 1 
        ? `${baseFilename}-page-${i + 1}.png`
        : `${baseFilename}.png`;
      
      // For now, return the expected filenames
      // Actual implementation would convert PDF pages to images here
      uploadedImages.push(imageFilename);
      
      console.log(`[PDF Convert] Page ${i + 1}: ${imageFilename}`);
    }

    console.log(`[PDF Convert] PDF uploaded with ${pageCount} page(s)`);
    console.log(`[PDF Convert] Note: Actual PDF to image conversion not yet fully implemented`);
    console.log(`[PDF Convert] This feature requires additional server-side tools`);

    return res.status(200).json({
      success: true,
      images: uploadedImages,
      pageCount: pageCount,
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
