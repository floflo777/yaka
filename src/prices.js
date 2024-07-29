const axios = require('axios');
const fs = require('fs');
const { Parser } = require('json2csv');

async function getTokenPrices() {
  try {
    const response = await axios.get('https://backend.yaka.finance/api/v1/assets');
    
    if (response.data.success) {
      const tokens = response.data.data;
      
      const fields = ['name', 'symbol', 'price', 'address'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(tokens);

      fs.writeFile('token_prices.csv', csv, (err) => {
        if (err) {
          console.error('Error writing to CSV file', err);
        } else {
          console.log('CSV file successfully written!');
        }
      });
    } else {
      console.log('Failed to retrieve token prices');
    }
  } catch (error) {
    console.error('Error fetching data from API:', error);
  }
}

getTokenPrices();
