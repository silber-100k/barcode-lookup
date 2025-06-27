# Barcode Lookup Tool

A web application that enhances CSV files containing UPC/barcode numbers with product images and retail prices using the Barcode Lookup API.

## Features

- 🔄 **CSV Upload**: Drag and drop CSV files or browse to select
- 📊 **Data Display**: View your CSV data in an interactive table
- 🔍 **Barcode Lookup**: Automatically fetch product images and prices
- 💰 **Price Comparison**: Find the best retail prices from multiple stores
- 📈 **Progress Tracking**: Real-time progress updates during processing
- 📉 **Rate Limiting**: Built-in API rate limit monitoring
- 📋 **Enhanced Export**: Download CSV with original data plus product information

## Getting Started

### Prerequisites

- Node.js 18+ 
- A [Barcode Lookup API](https://www.barcodelookup.com/api) key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd barcode-lookup-app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
Create a `.env.local` file in the root directory:
```
BARCODE_API_KEY=your_api_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## CSV Format

Your CSV file should contain a column named "UPC" with barcode numbers. Example:

```csv
UPC,Brand,Manufacturer,Title,PartNumbers,ModelNumbers,TotalQuantity
22788697586,,Brainerd,20 Inch Unichrome Ball Bearing Full Extension Drawer Slide 2 Pack,D80620V-UC-CI / 69758,,1
33923011730,Stanley,National Hardware,Light Duty T-Hinges 6 Inch Zinc Plated Steel 2 Pack,N128-702; S754-446,CD904 V284,1
```

## Deployment on Vercel

### Step 1: Prepare for Deployment

1. Ensure all code is committed to your Git repository
2. Make sure your `vercel.json` and `package.json` are properly configured

### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy the application**:
```bash
vercel
```

Follow the prompts:
- Link to existing project? **N**
- What's your project's name? **barcode-lookup-app**
- In which directory is your code located? **./**

### Step 3: Configure Environment Variables

In the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `BARCODE_API_KEY`: Your Barcode Lookup API key
   - `NEXT_PUBLIC_API_BASE_URL`: Your production URL (e.g., https://your-app.vercel.app)

### Step 4: Redeploy

After adding environment variables:
```bash
vercel --prod
```

## API Endpoints

### POST /api/barcode-lookup

Fetch product information for a single UPC.

**Request Body:**
```json
{
  "upc": "886736874135"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upc": "886736874135",
    "title": "Product Title",
    "image": "https://images.barcodelookup.com/...",
    "price": "$29.99",
    "rawData": {
      "stores": [...],
      "totalStores": 5
    }
  }
}
```

### GET /api/rate-limits

Check current API rate limits.

**Response:**
```json
{
  "allowed_calls_per_month": "500000",
  "remaining_calls_per_month": "408498",
  "allowed_calls_per_minute": "100",
  "remaining_calls_per_minute": "97"
}
```

## Usage

1. **Upload CSV**: Click the upload area or drag and drop your CSV file
2. **Review Data**: Check that your CSV data is displayed correctly
3. **Check API Limits**: Optional - click "Check API Limits" to see your usage
4. **Fetch Product Data**: Click "Fetch Product Data" to start the lookup process
5. **Monitor Progress**: Watch the progress bar and status updates
6. **Download Results**: Click "Download Enhanced CSV" to get your enhanced file

## Rate Limiting

The application respects API rate limits:
- **100 requests per minute** maximum
- **500,000 requests per month** (depending on your API plan)
- Built-in delays between requests to prevent rate limit violations
- Real-time rate limit monitoring

## Error Handling

The application handles various error scenarios:
- Invalid CSV format
- Missing UPC codes
- API rate limit exceeded
- Network connectivity issues
- Invalid API keys
- Product not found

## Technologies Used

- **Next.js 14**: React framework for the frontend and API routes
- **TypeScript**: Type safety and better development experience
- **Papa Parse**: CSV parsing library
- **Axios**: HTTP client for API requests
- **Vercel**: Deployment platform

## Cost Considerations

### Vercel (Free Tier)
- 100GB bandwidth per month
- 1000 serverless function invocations per day
- Suitable for small to medium usage

### Barcode Lookup API
- Check their pricing at [barcodelookup.com](https://www.barcodelookup.com/api)
- Free tier available with limited requests
- Pay-per-request or monthly plans available

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the error messages in the browser console
2. Verify your API key is correct
3. Ensure your CSV has a "UPC" column
4. Check API rate limits
5. Review the network tab for failed requests

## Troubleshooting

### Common Issues

**CSV not uploading:**
- Ensure file has .csv extension
- Check that file contains headers
- Verify UPC column exists

**API requests failing:**
- Verify API key is correct
- Check rate limits
- Ensure internet connectivity

**Deployment issues:**
- Verify environment variables are set in Vercel
- Check build logs for errors
- Ensure all dependencies are in package.json

### Debug Mode

To enable verbose logging, set:
```
NODE_ENV=development
```

This will show detailed API request/response information in the console. 