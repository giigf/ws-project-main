// worker.js
const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

console.log(`Worker started for URL: ${workerData.url}`);

(async () => {
    const { url } = workerData;
    try {
        const response = await axios.get(url);
        console.log(`Worker finished for URL: ${workerData.url}`);
        parentPort.postMessage(response.data);
    } catch (error) {
        console.log(`Worker error for URL: ${workerData.url}`);
        parentPort.postMessage({ error: error.message });
    }
})();