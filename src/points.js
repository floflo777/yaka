const axios = require('axios');
const fs = require('fs');

const url = 'https://backend-op.yaka.finance/user/rank?pageNum=1&pageSize=10000';

axios.get(url)
  .then(response => {
    if (response.data.code === 0 && response.data.msg === "success") {
      const userList = response.data.data.list;
      const filteredList = userList.map(user => ({
        address: user.address,
        totalPoints: user.totalPoints,
        nftBoost: user.nftBoost
      }));

      const csvContent = filteredList.map(user => `${user.address},${user.totalPoints},${user.nftBoost}`).join('\n');
      const header = "Address,Total Points,NFT Boost\n";
      const finalCsv = header + csvContent;

      fs.writeFile('user_rankings.csv', finalCsv, (err) => {
        if (err) {
          console.error('Error writing to file', err);
        } else {
          console.log('File successfully written!');
        }
      });
    } else {
      console.error('Failed to fetch data:', response.data.msg);
    }
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });
