const fetch = require('node-fetch');

async function addTestData() {
    try {
        const response = await fetch('http://localhost:3000/api/data/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: 'e6c4f8242dc83e58e67fadd55c07e167',
                field1: 23.5,
                field2: 65.2,
                field3: 1013.25
            })
        });
        
        const result = await response.json();
        console.log('Data added:', result);
    } catch (error) {
        console.error('Error adding test data:', error);
    }
}

addTestData();
