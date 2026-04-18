const { TextractClient, AnalyzeExpenseCommand } = require('@aws-sdk/client-textract');

const textractClient = new TextractClient({}); // Region is automatically inherited from Lambda env

exports.handler = async function (event) {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  try {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    // Decode the key to handle spaces and special characters appropriately
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Sending to Textract: s3://${bucket}/${key}`);

    const command = new AnalyzeExpenseCommand({
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    });

    const response = await textractClient.send(command);

    // Initialize our extraction result object
    const extractedData = {
      totalAmount: null,
      merchantName: null,
      date: null
    };

    // Textract's analyzeExpense returns an array of ExpenseDocuments
    if (response.ExpenseDocuments && response.ExpenseDocuments.length > 0) {
      const doc = response.ExpenseDocuments[0];
      
      // We look through the global summary fields for receipt-level items
      if (doc.SummaryFields) {
        for (const field of doc.SummaryFields) {
          const type = field.Type?.Text;
          const value = field.ValueDetection?.Text;
          
          if (type === 'TOTAL') {
            extractedData.totalAmount = value;
          } else if (type === 'VENDOR_NAME') {
            extractedData.merchantName = value;
          } else if (type === 'INVOICE_RECEIPT_DATE') {
            extractedData.date = value;
          }
        }
      }
    }

    console.log('=== EXTRACTED RECEIPT DATA ===');
    console.log(JSON.stringify(extractedData, null, 2));
    console.log('==============================');

    return extractedData;

  } catch (error) {
    console.error('Error processing S3 Object with AWS Textract:', error);
    throw error;
  }
};