const ctx = document.getElementById('myChart').getContext('2d');
let myChart;
let currentPair = 'ethusdt';
let historicalData = JSON.parse(localStorage.getItem(currentPair)) || { labels: [], data: [] };
let timeframe = '1m'; // Default timeframe
let socket = null;

// Function to close the WebSocket connection gracefully
function closeWebSocket() {
    if (socket) {
        console.log('Closing WebSocket connection for:', currentPair);
        socket.send(JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`${currentPair}@kline_${timeframe}`],
            id: 1
        }));
        
        socket.close();  // Close the WebSocket
        socket.onclose = () => console.log('WebSocket closed for pair:', currentPair);
        socket = null;  // Clear the socket after closing
    }
}

// Function to initialize the WebSocket
function initializeWebSocket(pair) {
    closeWebSocket(); // Close the existing connection before initializing a new one
    
    socket = new WebSocket('wss://stream.binance.com:9443/ws');

    socket.onopen = function () {
        console.log('WebSocket connected for pair:', pair);
        socket.send(JSON.stringify({
            method: "SUBSCRIBE",
            params: [`${pair}@kline_${timeframe}`],
            id: 1
        }));
    };

    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        console.log('WebSocket message for', currentPair, message);

        if (message.e === 'kline') {
            const kline = message.k;
            const time = new Date(kline.t).toLocaleTimeString();
            const closePrice = parseFloat(kline.c);
            addData(time, closePrice);
        }
    };

    socket.onclose = function () {
        console.log('WebSocket closed for pair:', pair);
    };

    socket.onerror = function (error) {
        console.error('WebSocket error for pair:', pair, error);
    };
}

// Select a cryptocurrency pair and initialize everything
function selectPair(pair) {
    currentPair = pair;
    historicalData = JSON.parse(localStorage.getItem(pair)) || { labels: [], data: [] };

    // Destroy the existing chart before creating a new one
    if (myChart) {
        myChart.destroy();
    }

    createChart();
    initializeWebSocket(pair); // Re-initialize the WebSocket for the new pair
}

// Add new data to the chart and update it
function addData(time, price) {
    if (historicalData.labels.length >= 10) { // Keep only the latest 10 data points
        historicalData.labels.shift();
        historicalData.data.shift();
    }

    historicalData.labels.push(time);
    historicalData.data.push(price);
    localStorage.setItem(currentPair, JSON.stringify(historicalData));

    if (myChart) {
        myChart.update();
    }
}

// Create the chart using Chart.js
function createChart() {
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicalData.labels,
            datasets: [{
                label: `${currentPair.toUpperCase()} Price`,
                data: historicalData.data,
                borderColor: '#090909',
                borderWidth: 1,
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USDT)'
                    }
                }
            }
        }
    });
}

// Initial setup
createChart();
initializeWebSocket(currentPair);
