# Demo Instructions

## Quick Test with Sample Data

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   Visit [http://localhost:3000](http://localhost:3000)

3. **Test with sample CSV:**
   - Use the `barcode.csv` file already included in the project
   - Drag and drop it into the upload area
   - You should see 17 rows of hardware product data

4. **Test API functionality:**
   - Click "Check API Limits" to verify your API key works
   - Click "Fetch Product Data" to start processing
   - Watch the progress bar and status updates

## Expected Results

The sample CSV contains UPC codes for hardware items. After processing, you should see:
- Product images for items that have them
- Retail prices from various stores
- Status indicators showing success/error for each item
- Enhanced CSV download with all new data

## Sample UPC to Test Manually

If you want to test individual lookups, try these UPCs from the sample file:
- `22788697586` - Brainerd drawer slide
- `33923011730` - Stanley hinges
- `33923013772` - Stanley craft hinges

## Troubleshooting

**If you see "Product not found" errors:**
- This is normal for some UPCs that may not be in the barcode database
- Hardware items sometimes have limited barcode coverage
- Try with other UPCs like books (ISBN numbers work well)

**If you get rate limit errors:**
- Wait a minute before retrying
- Check your API key is valid
- Verify you haven't exceeded monthly limits

**Test with a book ISBN:**
For better success rates, try uploading a CSV with book ISBNs like:
```csv
UPC,Title
9780140157376,Haroun and the Sea of Stories
```

This should return good product data with image and pricing. 