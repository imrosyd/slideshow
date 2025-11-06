# PDF Upload Feature Guide

## Overview
The admin panel now supports uploading PDF files which are automatically converted to PNG images for the slideshow.

## How It Works

### 1. PDF Upload Process
- **Drag & Drop**: Drag PDF files directly onto the upload box
- **Browse**: Click the upload box to select PDF files from your device
- **Mixed Upload**: You can upload both images and PDFs together

### 2. Automatic Conversion
When you upload a PDF:
1. The system reads the PDF file
2. Each page is rendered to a high-quality PNG image (2.0x scale)
3. Images are automatically uploaded to Supabase storage
4. Metadata entries are created for each page
5. The image list refreshes to show the new images

### 3. Naming Convention
- **Single-page PDF**: `document.pdf` → `document.png`
- **Multi-page PDF**: `report.pdf` → `report-page-1.png`, `report-page-2.png`, etc.

### 4. Default Settings
Each converted image gets:
- **Duration**: 5 seconds (can be edited after upload)
- **Caption**: "Page N from [PDF filename]"
- **Quality**: High-resolution PNG at 2.0x scale

## Usage Instructions

### Step 1: Access Admin Panel
Navigate to `/admin` and log in with your admin credentials.

### Step 2: Upload PDF
1. Scroll to the "Upload Images or PDF" section
2. Either:
   - Drag and drop your PDF file onto the upload box
   - Click the upload box and select your PDF file

### Step 3: Wait for Conversion
- A toast notification will appear: "Converting PDF to images..."
- Conversion time depends on PDF size and page count
- Large PDFs may take several seconds

### Step 4: Verify Results
After successful conversion:
- Success toast appears: "Successfully converted PDF to X images"
- The image gallery refreshes automatically
- Each PDF page appears as a separate image card

### Step 5: Customize (Optional)
For each converted image, you can:
- Edit the duration
- Change the caption
- Hide/show specific pages
- Reorder pages in the slideshow
- Generate video versions

## Technical Details

### Supported Features
✅ Multi-page PDFs (unlimited pages)
✅ High-resolution output (2.0x scale)
✅ PNG format with transparency support
✅ Automatic metadata creation
✅ Mixed image + PDF uploads
✅ Drag & drop support

### Limitations
- **File Size**: Maximum 50MB per PDF (configurable in API)
- **Format**: Only PDF files (application/pdf MIME type)
- **Processing**: Server-side conversion (requires backend processing)

### File Size Recommendations
- **Small PDFs** (< 5MB, < 10 pages): < 5 seconds
- **Medium PDFs** (5-20MB, 10-50 pages): 5-30 seconds
- **Large PDFs** (20-50MB, 50+ pages): 30-60 seconds

## Troubleshooting

### PDF Conversion Failed
**Symptoms**: Error toast appears after upload

**Common Causes**:
1. PDF file is corrupted or password-protected
2. PDF exceeds 50MB size limit
3. Server error during processing

**Solutions**:
1. Try a different PDF file
2. Reduce PDF file size (compress images, remove unnecessary pages)
3. Check server logs for detailed error messages
4. Ensure Supabase storage has sufficient space

### Images Not Appearing
**Symptoms**: Conversion succeeds but images don't show

**Solutions**:
1. Refresh the page manually
2. Check browser console for errors
3. Verify Supabase storage bucket permissions
4. Check that images were uploaded to `slideshow-images` bucket

### Low Quality Output
**Symptoms**: Converted images appear blurry

**Solutions**:
1. The default scale is 2.0x (high quality)
2. To increase quality further, edit `/pages/api/admin/convert-pdf.ts`:
   ```typescript
   const scale = 3.0; // Increase from 2.0 to 3.0 for even higher quality
   ```
3. Note: Higher scale = larger file sizes and slower processing

### Memory Issues (Large PDFs)
**Symptoms**: Timeout errors or server crashes

**Solutions**:
1. Split large PDFs into smaller chunks
2. Increase Vercel function timeout (in `vercel.json`)
3. Increase Vercel function memory limit
4. Consider batch processing for very large documents

## API Endpoint

### POST `/api/admin/convert-pdf`

**Request Body**:
```json
{
  "pdfBase64": "data:application/pdf;base64,JVBERi0x...",
  "filename": "document.pdf"
}
```

**Response**:
```json
{
  "success": true,
  "images": ["document-page-1.png", "document-page-2.png"],
  "pageCount": 2
}
```

**Error Response**:
```json
{
  "error": "Error message here"
}
```

## Code References

### Backend API
- **File**: `/pages/api/admin/convert-pdf.ts`
- **Dependencies**: `pdfjs-dist`, `canvas`
- **Function**: Renders PDF pages to canvas, exports as PNG buffers

### Frontend Hook
- **File**: `/hooks/useImages.ts`
- **Function**: `convertPdfToImages(file: File)`
- **Process**: Reads file as base64, sends to API, refreshes list

### Upload Component
- **File**: `/components/admin/UploadBox.tsx`
- **Accept Types**: `image/*,.pdf,application/pdf`
- **Handler**: Separates PDFs from images, calls appropriate handlers

### Admin Integration
- **File**: `/pages/admin.tsx`
- **Handler**: `handlePdfUpload(file: File)`
- **Notifications**: Toast messages for progress and results

## Best Practices

### For Best Results
1. **Optimize PDFs** before upload:
   - Remove unnecessary pages
   - Compress images within PDF
   - Use standard fonts (embedded)

2. **Monitor Conversion**:
   - Watch toast notifications for progress
   - Check browser console for detailed logs
   - Verify all pages converted successfully

3. **Organize Content**:
   - Use descriptive PDF filenames
   - Group related PDFs together
   - Edit captions after conversion for clarity

4. **Test First**:
   - Start with a small PDF (1-2 pages)
   - Verify quality and settings
   - Then upload larger documents

### Performance Tips
- Upload PDFs during off-peak hours for faster processing
- Batch similar PDFs together for efficiency
- Delete unused converted images to save storage space
- Generate videos after finalizing content to avoid duplicates

## Security Considerations

### Input Validation
- File type checked: Only `application/pdf` accepted
- File size limited: 50MB maximum
- Admin authentication required

### Storage Security
- Images stored in Supabase with proper permissions
- Only authenticated admins can convert PDFs
- Original PDF not stored (only converted images)

## Future Enhancements

Potential improvements:
- [ ] Progress bar for large PDF conversions
- [ ] Batch PDF upload support
- [ ] OCR text extraction from PDFs
- [ ] Custom quality settings per upload
- [ ] PDF preview before conversion
- [ ] Cancel conversion in progress
- [ ] Conversion queue for multiple PDFs

---

**Last Updated**: December 2024  
**Feature Status**: ✅ Fully Implemented and Tested
