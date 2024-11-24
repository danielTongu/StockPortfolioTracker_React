
/**
 * File: App.js
 *
 * This React application provides an interactive platform for tracking and analyzing stock market data in real-time.
 *
 * Users can:
 *  -   Add up to 10 stocks to the dashboard for a comprehensive overview of their performance.
 *  -   View detailed information and visualizations for individual stocks
 *  -   Analyze stock performance across multiple timeframes, such as daily, monthly, yearly, or custom durations.
 *  -   Leverage the Alpha Vantage API for accurate and up-to-date stock market data.
 */


import React, {useEffect, useRef, useState} from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import './App.css';




const API_KEY = process.env.REACT_APP_API_KEY;
const MAX_STOCK_SYMBOL_LENGTH = 20;
const NUM_STOCKS = 10;




function App() {
    // State variables
    const [stockSymbols, setStockSymbols] = useState(Array(NUM_STOCKS).fill(null)); // Stores up to 10 stocks
    const [selectedStock, setSelectedStock] = useState(null); // Currently selected stock for detailed view
    const [timeFrame, setTimeFrame] = useState("1D"); // Selected time frame for data
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Controls visibility of the add stock dialog
    const [currentSlot, setCurrentSlot] = useState(null); // Slot index for adding or replacing a stock
    const [stockInput, setStockInput] = useState(""); // User input for stock symbol
    const [isLoading, setIsLoading] = useState(false); // Loading state for data fetching



    // Function to open the add/replace stock dialog
    function openAddOrReplaceModal(slotId) {
        setCurrentSlot(slotId);
        setIsDialogOpen(true);
        setStockInput("");
    }



    // Function to close the add stock dialog
    function closeAddModal() {
        setIsDialogOpen(false);
        setStockInput("");
    }



    // Handle changes in the stock input field
    function handleStockInputChange(event) {
        const inputValue = event.target.value.toUpperCase();
        setStockInput(inputValue.slice(0, MAX_STOCK_SYMBOL_LENGTH)); // Enforce the max length
    }



    // Add or replace a stock in the grid
    async function addOrReplaceStock() {
        let resultMessage = ""; // Placeholder for return message
        let inputSymbol = stockInput.trim().toUpperCase();

        if (!inputSymbol) {
            resultMessage = "Please enter a valid stock symbol.";
        } else if (stockSymbols.some(stock => stock && stock.symbol === inputSymbol)) {
            closeAddModal(); // Dont proceed with duplicates
        } else {
            try {
                const stockData = await fetchStockData({
                    apiKey: API_KEY,
                    query: inputSymbol,
                    timeFrame: timeFrame
                });

                if (stockData && stockData.symbol === inputSymbol) {
                    setStockSymbols(prev => {
                        const updatedSymbols = [...prev];
                        updatedSymbols[currentSlot] = stockData;
                        return updatedSymbols;
                    });

                    closeAddModal();
                } else {
                    resultMessage = "No data found for the provided stock symbol.";
                }
            } catch (error) {
                resultMessage = `Error fetching stock data: ${error.message}`;
            }
        }

        // Single exit point
        if (resultMessage) alert(resultMessage);
    }



    // Remove a stock from a slot
    function handleRemoveStock(slotId) {
        setStockSymbols(function (prevSymbols) {
            let updatedSymbols = prevSymbols.slice();
            updatedSymbols[slotId] = null;
            return updatedSymbols;
        });
    }



    // Handle time frame selection
    function handleTimeFrameClick(period) {
        setTimeFrame(period);
    }



    // Effect to fetch data when timeFrame changes and a stock is selected
    useEffect(function () {
        if (selectedStock) {
            setIsLoading(true);
            fetchStockData({
                apiKey: API_KEY,
                query: selectedStock.symbol,
                timeFrame: timeFrame,
            }).then(function (stockData) {
                setSelectedStock(stockData);
                setIsLoading(false);
            }).catch(function (error) {
                console.error(error);
                alert(error.message);
                setIsLoading(false);
            });
        }
    }, [timeFrame]);



    // Handle clicking on a stock in the grid to view details
    async function handleStockClick(stock) {
        setIsLoading(true);
        try {
            let stockData = await fetchStockData({
                apiKey: API_KEY,
                query: stock.symbol,
                timeFrame: timeFrame,
            });
            setSelectedStock(stockData);
            setIsLoading(false);
        } catch (error) {
            console.error(error);
            alert(error.message);
            setIsLoading(false);
        }
    }



    // Show the stocks grid (hide details view)
    function showStocksGrid() {
        setSelectedStock(null);
    }


    // Render the component
    return (
        <div>
            <header>
                <div>
                    <h1>Stock {selectedStock ? 'Details' : 'Cards'}</h1>
                    <button
                        id="button-home"
                        onClick={showStocksGrid}
                        style={{display: selectedStock ? "inline" : "none"}}
                    >
                        <svg height="30" viewBox="0 0 24 24" width="30">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/>
                        </svg>
                    </button>
                </div>
            </header>
            <main>
                {selectedStock ? (
                    // Show StockDetails component if a stock is selected
                    <StockDetails
                        stockDetails={selectedStock}
                        timeFrame={timeFrame}
                        handleTimeFrameClick={handleTimeFrameClick}
                        isLoading={isLoading}
                    />
                ) : (
                    // Show Grid component otherwise
                    <Grid
                        stocks={stockSymbols}
                        onAddStock={openAddOrReplaceModal}
                        onStockSelect={handleStockClick}
                        onRemoveStock={handleRemoveStock}
                    />
                )}
                {isDialogOpen && (
                    // Show StockDialog if dialog is open
                    <StockDialog
                        onSubmit={addOrReplaceStock}
                        onClose={closeAddModal}
                        stockInput={stockInput}
                        handleStockInputChange={handleStockInputChange}
                    />
                )}
            </main>
            <footer>
                <p>©<span id="current-year">{new Date().getFullYear()}</span> Group 2, CS480 Fall2024. All rights
                    reserved.</p>
            </footer>
        </div>
    );
}




function Grid(props) {
    const {stocks, onAddStock, onStockSelect, onRemoveStock} = props;

    return (
        <ul id="stocks-grid">
            {stocks.map(function (stock, index) {
                return (
                    <StockSlot
                        key={index}
                        slotId={index}
                        symbol={stock && stock.symbol}
                        stockName={stock && stock.name}
                        price={stock && stock.price}
                        change={stock && stock.changePercent}
                        onAdd={onAddStock}
                        onFetchDetails={function () {
                            onStockSelect(stock);
                        }}
                        onRemove={function () {
                            onRemoveStock(index);
                        }}
                        onReplace={onAddStock}
                    />
                );
            })}
        </ul>
    );
}




function StockSlot(props) {
    const {slotId, symbol, stockName, price, change, onAdd, onFetchDetails, onRemove, onReplace} = props;

    const isStockAdded = Boolean(symbol);

    return (
        <li
            data-slot-id={slotId}
            className={`${isStockAdded ? 'stock-slot' : 'empty-slot'}`}
            onClick={!isStockAdded ? function () {
                onAdd(slotId);
            } : undefined}
        >
            {isStockAdded ? (
                <>
                    {/* If stock is added, show its details */}
                    <section onClick={function (e) {
                        e.stopPropagation();
                        onFetchDetails();
                    }}>
                        <p className="stock-symbol">{symbol}</p>
                        <p className="stock-name">{stockName}</p>
                        <span className="current-price">{formatPrice(price)}</span>
                        <span className={`price-change ${getPriceChangeClass(change)}`}>
                            {formatChangePercent(change)}
                        </span>
                    </section>
                    {/* Replace and Remove buttons */}
                    <button data-button-text="replace" className="replace-button" onClick={function (e) {
                        e.stopPropagation();
                        onReplace(slotId);
                    }}></button>
                    <button className="close-button" onClick={function (e) {
                        e.stopPropagation();
                        onRemove(slotId);
                    }}></button>
                </>
            ) : (
                <button className="add-button" onClick={() => onAdd(slotId)}>Add Stock</button>
            )}
        </li>
    );
}




function StockDialog(props) {
    const {onSubmit, onClose, stockInput, handleStockInputChange} = props;

    // Create a ref for the input field
    const inputRef = useRef(null);

    // Automatically focus on the input field when the dialog opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <dialog id='add-stock-dialog' className={'open'}>
            <section>
                <button className='close-button' onClick={onClose}></button>
                <p>Add or Replace Stock</p>
                <input
                    id='stock-input'
                    type="text"
                    value={stockInput}
                    onChange={handleStockInputChange}
                    placeholder="Enter Stock Symbol"
                    ref={inputRef} // Attach the ref to the input
                    maxLength={MAX_STOCK_SYMBOL_LENGTH} // Set the maximum length
                />
                <div id='button-group'>
                    <button data-button-text='ok' onClick={onSubmit}></button>
                    <button data-button-text='cancel' onClick={onClose}></button>
                </div>
            </section>
        </dialog>
    );
}




function StockDetails(props) {
    const {stockDetails, timeFrame, handleTimeFrameClick, isLoading} = props;

    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const additionalStatsRef = useRef([]);

    // Effect to render the chart when stockDetails change
    useEffect(() => {
        if (stockDetails && stockDetails.dates && stockDetails.timeSeries) {
            renderChart(stockDetails);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [stockDetails]);



    // Function to render the chart
    function renderChart(data) {
        const ctx = canvasRef.current.getContext("2d");

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // Extract adjusted close prices for the chart
        const prices = data.dates.map(function (date) {
            const dataPoint = data.timeSeries[date];
            return dataPoint['5. adjusted close']
                ? parseFloat(dataPoint['5. adjusted close'])
                : parseFloat(dataPoint['4. close']);
        });

        // Store stats in a ref to be accessible in the tooltip callback
        additionalStatsRef.current = data.dates.map(function (date) {
            const dataPoint = data.timeSeries[date];
            return {
                date: date,
                open: parseFloat(dataPoint['1. open']),
                high: parseFloat(dataPoint['2. high']),
                low: parseFloat(dataPoint['3. low']),
                close: parseFloat(dataPoint['4. close']),
                adjustedClose: dataPoint['5. adjusted close'] ? parseFloat(dataPoint['5. adjusted close']) : null,
                dividendAmount: dataPoint['7. dividend amount'] ? parseFloat(dataPoint['7. dividend amount']) : null,
                splitCoefficient: dataPoint['8. split coefficient'] ? parseFloat(dataPoint['8. split coefficient']) : null,
                volume: parseInt(dataPoint[data.volumeKey])
            };
        });

        const {borderColor, backgroundColor} = getOverallColor(data.timeSeries, data.dates);

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: `${data.symbol} Price`,
                    data: prices,
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    fill: true,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: borderColor,
                    tension: 0.1 // Smooth curves
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {unit: data.timeUnit},
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#1f1f1f',
                            font: {size: 20}
                        },
                        grid: {
                            color: 'rgb(31,31,31)',
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        ticks: {
                            color: '#e0e0e0',
                            maxTicksLimit: data.ticks,
                            autoSkip: true
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Price',
                            color: '#1f1f1f',
                            font: {size: 20}
                        },
                        grid: {
                            color: 'rgb(31,31,31)',
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        ticks: {
                            color: '#e0e0e0',
                            callback: function (value) {
                                return formatPrice(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(255,255,255, 0.9)',
                        borderColor: borderColor,
                        borderWidth: 3,
                        titleColor: borderColor,
                        bodyColor: '#000000',
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                const index = context.dataIndex;
                                const stat = additionalStatsRef.current[index];

                                if (!stat) {
                                    return "Loading data. Click another timeline tab, then revisit this.";
                                }

                                return [
                                    `Close: ${formatPrice(stat.close)}`,
                                    `Open: ${formatPrice(stat.open)}`,
                                    `High: ${formatPrice(stat.high)}`,
                                    `Low: ${formatPrice(stat.low)}`,
                                    `Volume: ${stat.volume.toLocaleString()}`
                                ];
                            }
                        }
                    },
                    legend: {
                        labels: {color: '#1f1f1f'}
                    }
                }
            }
        });
    }



    // Function to get color for the chart based on overall percentage change
    function getOverallColor(timeSeries, dates) {
        const percentageChange = calculatePercentageChange(timeSeries, dates);
        let borderColor, backgroundColor;

        if (percentageChange < 0) {
            borderColor = 'red';
            backgroundColor = 'rgba(255, 0, 0, 0.1)';
        } else if (percentageChange > 0) {
            borderColor = 'green';
            backgroundColor = 'rgba(0, 255, 0, 0.1)';
        } else {
            borderColor = 'blue';
            backgroundColor = 'rgba(0, 0, 255, 0.1)';
        }
        return {borderColor, backgroundColor};
    }

    return (
        <section id="stock-details">
            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <div className="stock-header">
                        <span className="stock-symbol">{stockDetails && stockDetails.symbol}</span>
                        <span className="stock-name">{stockDetails && stockDetails.name}</span>
                    </div>
                    <div className="stock-price-change">
                        <span className="current-price">
                            {formatPrice(stockDetails.price)}
                        </span>
                        <span className={`price-change ${getPriceChangeClass(stockDetails.changePercent)}`}>
                            {formatChangePercent(stockDetails.changePercent)}
                        </span>
                    </div>
                    <ul id="time-options">
                        {["1D", "5D", "1M", "3M", "YTD", "1Y", "5Y", "ALL"].map((period) => (
                            <li
                                key={period}
                                data-period={period}
                                className={timeFrame === period ? 'active' : ''}
                                onClick={() => handleTimeFrameClick(period)}
                            ></li>
                        ))}
                    </ul>
                    <div id="chart-container">
                        <canvas ref={canvasRef}></canvas>
                    </div>
                    <ul className="stock-stats">
                        {renderStat("Previous Close", formatPrice(stockDetails.previousClose))}
                        {renderStat("Open", formatPrice(stockDetails.openPrice))}
                        {renderStat("Day's Range", formatRange(stockDetails.dayLow, stockDetails.dayHigh))}
                        {renderStat("52 Week Range", formatRange(stockDetails.weekLow, stockDetails.weekHigh))}
                        {renderStat("Volume", formatNumber(stockDetails.volume))}
                        {renderStat("Avg. Volume", formatNumber(stockDetails.avgVolume))}
                        {renderStat("Market Cap (intraday)", formatMarketCap(stockDetails.marketCap))}
                        {renderStat("Beta (5Y Monthly)", formatNumber(stockDetails.beta, 2))}
                        {renderStat("PE Ratio (TTM)", formatNumber(stockDetails.peRatio, 2))}
                        {renderStat("EPS (TTM)", formatPrice(stockDetails.eps))}
                        {renderStat("1y Target Est.", formatPrice(stockDetails.targetEst))}
                        {renderStat("Dividend Amount", formatPrice(stockDetails.dividendAmount))}
                    </ul>
                </>
            )}
        </section>
    );
}


// Helper functions



/**
 * Helper function to render a single stat
 * @param {string} label - The label of the stat.
 * @param {string|number|null} value - The value of the stat.
 * @returns {JSX.Element} - The rendered <li> element.
 */
function renderStat(label, value) {
    return (<li key={label} data-stat={label}>{value !== null && value !== undefined ? value : "N/A"}</li>);
}




/**
 * Format a price value.
 * @param {number|null} price - The price to format.
 * @returns {string} - Formatted price.
 */
function formatPrice(price) {
    return price !== null && price !== undefined ? `${price.toFixed(2)}` : "N/A";
}




/**
 * Format a percentage change value.
 * @param {number|null} changePercent - The percentage change.
 * @returns {string} - Formatted percentage change.
 */
function formatChangePercent(changePercent) {
    return changePercent !== null && changePercent !== undefined ? `${changePercent.toFixed(2)}` : "0.00";
}




/**
 * Get CSS class for price change based on its value.
 * @param {number|null} change - The change value.
 * @returns {string} - CSS class name.
 */
function getPriceChangeClass(change) {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return '';
}




/**
 * Format a range value.
 * @param {number|null} low - The low value.
 * @param {number|null} high - The high value.
 * @returns {string} - Formatted range.
 */
function formatRange(low, high) {
    if (low !== null && high !== null) {
        return `${formatPrice(low)} - ${formatPrice(high)}`;
    }
    return "N/A";
}




/**
 * Format a number with optional decimal places.
 * @param {number|null} value - The number to format.
 * @param {number} [decimals=0] - Number of decimal places.
 * @returns {string} - Formatted number.
 */
function formatNumber(value, decimals = 0) {
    return value !== null && value !== undefined ?
        value.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "N/A";
}




/**
 * Fetch stock data including time series and overview information.
 * @param {Object} params - Parameters for fetching stock data.
 * @param {string} params.apiKey - Alpha Vantage API key.
 * @param {string} params.query - Stock symbol to query.
 * @param {string} params.timeFrame - Time frame for the data.
 * @returns {Object} - Stock data including various statistics.
 */
async function fetchStockData(params) {
    const {apiKey, query, timeFrame} = params;

    try {
        // Use the helper function to search for the stock symbol
        const {symbol, name} = await searchSymbol(apiKey, query);

        // Get parameters for the selected time frame
        const timeFrameParams = getTimeFrameParams(timeFrame);
        const {endpoint, interval, dateRange, timeUnit, ticks} = timeFrameParams;

        // Determine the volume key based on the endpoint
        const volumeKey = (endpoint.includes('ADJUSTED')) ? '6. volume' : '5. volume';

        // Build the API URL based on the endpoint
        const url = endpoint === 'TIME_SERIES_INTRADAY'
            ? `https://www.alphavantage.co/query?function=${endpoint}&symbol=${symbol}&interval=${interval}&apikey=${apiKey}`
            : `https://www.alphavantage.co/query?function=${endpoint}&symbol=${symbol}&apikey=${apiKey}`;

        // Fetch the time series data
        const response = await fetch(url);
        const data = await response.json();

        const timeSeriesKeyMap = {
            'TIME_SERIES_INTRADAY': `Time Series (${interval})`,
            'TIME_SERIES_DAILY': 'Time Series (Daily)',
            'TIME_SERIES_DAILY_ADJUSTED': 'Time Series (Daily)',
            'TIME_SERIES_WEEKLY': 'Weekly Time Series',
            'TIME_SERIES_WEEKLY_ADJUSTED': 'Weekly Adjusted Time Series',
            'TIME_SERIES_MONTHLY': 'Monthly Time Series',
            'TIME_SERIES_MONTHLY_ADJUSTED': 'Monthly Adjusted Time Series'
        };

        const timeSeriesKey = timeSeriesKeyMap[endpoint];
        const timeSeries = data[timeSeriesKey];

        if (!timeSeries) {
            throw new Error(`Time series data unavailable for "${timeFrame}".`);
        }

        // Get dates for the chart
        const allDates = Object.keys(timeSeries);
        const slicedDates = dateRange === Infinity ? allDates : allDates.slice(0, dateRange);
        const dates = slicedDates.reverse(); // Chronological order

        // Fetch overview data
        const overviewData = await fetchStockOverview(apiKey, symbol);

        // Extract PE Ratio and Market Cap
        const peRatio = overviewData['PERatio'] ? parseFloat(overviewData['PERatio']) : null;
        const marketCap = overviewData['MarketCapitalization'] ? parseFloat(overviewData['MarketCapitalization']) : null;

        // Extract additional stats if available
        const beta = overviewData['Beta'] ? parseFloat(overviewData['Beta']) : null;
        const eps = overviewData['EPS'] ? parseFloat(overviewData['EPS']) : null;
        const earningsDate = overviewData['EarningsDate'] || null; // Format as per API
        const targetEst = overviewData['AnalystTargetPrice'] ? parseFloat(overviewData['AnalystTargetPrice']) : null;

        // Compute detailed stats, pass the volumeKey
        const stats = computeDetailedStats(timeSeries, dates, volumeKey);

        return {
            symbol,
            name,
            latestDate: dates[dates.length - 1],
            price: parseFloat(timeSeries[dates[dates.length - 1]]['4. close']),
            changePercent: calculatePercentageChange(timeSeries, dates),
            dates,
            timeSeries,
            timeUnit,
            ticks,
            volumeKey,
            previousClose: stats.previousClose,
            openPrice: stats.openPrice,
            volume: stats.volume,
            dayLow: stats.dayLow,
            dayHigh: stats.dayHigh,
            weekLow: stats.weekLow,
            weekHigh: stats.weekHigh,
            avgVolume: stats.avgVolume,
            adjustedClose: stats.adjustedClose,
            dividendAmount: stats.dividendAmount,
            splitCoefficient: stats.splitCoefficient,
            beta,
            peRatio,
            eps,
            earningsDate,
            targetEst,
            marketCap
        };
    } catch (error) {
        console.error("Error while fetching stock data:", error.message || error);
        throw new Error(`Could not fetch data for "${query}": ${error.message || "Please try again later."}`);
    }
}




/**
 * Separate function to search for a stock symbol.
 * @param {string} apiKey - Alpha Vantage API key.
 * @param {string} query - The stock symbol to search for.
 * @returns {Object} - Contains the symbol and name of the stock.
 */
async function searchSymbol(apiKey, query) {
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${apiKey}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.bestMatches || searchData.bestMatches.length === 0) {
        throw new Error(`No matches found for symbol "${query}"`);
    }

    const symbol = searchData.bestMatches[0]['1. symbol'];
    const name = searchData.bestMatches[0]['2. name'];
    return {symbol, name};
}




/**
 * Fetch overview data for a stock symbol.
 * @param {string} apiKey - Alpha Vantage API key.
 * @param {string} symbol - Stock symbol.
 * @returns {Object} - Overview data.
 */
async function fetchStockOverview(apiKey, symbol) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || Object.keys(data).length === 0) {
        console.warn('Overview data is not available.');
        return {};
    }

    return data;
}




/**
 * Determine API parameters based on the selected time frame.
 * @param {string} timeFrame - Selected time frame.
 * @returns {Object} - API parameters.
 */
function getTimeFrameParams(timeFrame = '1D') {
    let endpoint = 'TIME_SERIES_DAILY';
    let interval = '';
    let dateRange;
    let timeUnit;
    let ticks;

    switch (timeFrame) {
        case '1D':
            endpoint = 'TIME_SERIES_INTRADAY';
            interval = '60min';
            dateRange = 7; // Approximate number of intervals in a trading day
            timeUnit = 'hour';
            ticks = 7;
            break;
        case '5D':
            endpoint = 'TIME_SERIES_INTRADAY';
            interval = '60min';
            dateRange = 5 * 7; // Approximate intervals for 5 days
            timeUnit = 'hour';
            ticks = 35; // 5 days * 7 intervals per day
            break;
        case '1M':
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            dateRange = 22; // Approximate trading days in a month
            timeUnit = 'day';
            ticks = 22;
            break;
        case '3M':
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            dateRange = 66; // Approximate trading days in 3 months
            timeUnit = 'week';
            ticks = 13; // Approximate weeks in 3 months
            break;
        case 'YTD':
            const currentDate = new Date();
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
            const daysSinceStartOfYear = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24));
            dateRange = daysSinceStartOfYear;
            timeUnit = 'month';
            ticks = currentDate.getMonth() + 1; // Number of months since start of year
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            break;
        case '1Y':
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            dateRange = 365;
            timeUnit = 'month';
            ticks = 12;
            break;
        case '5Y':
            endpoint = 'TIME_SERIES_WEEKLY_ADJUSTED';
            dateRange = 5 * 52;
            timeUnit = 'year';
            ticks = 5;
            break;
        case 'ALL':
            endpoint = 'TIME_SERIES_MONTHLY_ADJUSTED';
            dateRange = Infinity;
            timeUnit = 'year';
            ticks = 20;
            break;
        default:
            throw new Error('Invalid time frame: ' + timeFrame);
    }

    return {endpoint, interval, timeUnit, dateRange, ticks};
}




/**
 * Calculate the percentage change between the first and last dates.
 * @param {Object} timeSeries - Time series data.
 * @param {Array} dates - Array of dates.
 * @returns {number} - Percentage change.
 */
function calculatePercentageChange(timeSeries, dates) {
    if (dates.length < 2) return 0;

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const firstData = timeSeries[firstDate];
    const lastData = timeSeries[lastDate];

    if (!firstData || !lastData) return 0;

    const firstPrice = parseFloat(firstData['4. close']);
    const lastPrice = parseFloat(lastData['4. close']);

    return ((lastPrice - firstPrice) / firstPrice) * 100;
}




/**
 * Compute detailed statistics from the time series data.
 * @param {Object} timeSeries - Time series data.
 * @param {Array} dates - Array of dates.
 * @param {string} volumeKey - The key to access volume data.
 * @returns {Object} - Detailed statistics.
 */
function computeDetailedStats(timeSeries, dates, volumeKey) {
    if (dates.length < 2) {
        return {
            previousClose: null,
            openPrice: null,
            dayLow: null,
            dayHigh: null,
            volume: null,
            adjustedClose: null,
            dividendAmount: null,
            splitCoefficient: null,
            weekLow: null,
            weekHigh: null,
            avgVolume: null
        };
    }

    const latestData = timeSeries[dates[dates.length - 1]];
    const previousData = timeSeries[dates[dates.length - 2]];
    const previousClose = previousData ? parseFloat(previousData['4. close']) : null;
    const dayHigh = latestData ? parseFloat(latestData['2. high']) : null;
    const dayLow = latestData ? parseFloat(latestData['3. low']) : null;
    const openPrice = latestData ? parseFloat(latestData['1. open']) : null;
    const volume = latestData ? parseInt(latestData[volumeKey]) : null;

    // Adjusted Close
    const adjustedClose = latestData && latestData['5. adjusted close'] !== undefined
        ? parseFloat(latestData['5. adjusted close'])
        : null;

    // Dividend Amount
    const dividendAmount = latestData && latestData['7. dividend amount'] !== undefined
        ? parseFloat(latestData['7. dividend amount'])
        : null;

    // Split Coefficient
    const splitCoefficient = latestData && latestData['8. split coefficient'] !== undefined
        ? parseFloat(latestData['8. split coefficient'])
        : null;

    // 52-week Range
    const past52Weeks = Object.keys(timeSeries).slice(-260); // Approximately 260 trading days in 52 weeks
    const weekLow = past52Weeks.length > 0
        ? Math.min(...past52Weeks.map(date => parseFloat(timeSeries[date]['3. low'])))
        : null;
    const weekHigh = past52Weeks.length > 0
        ? Math.max(...past52Weeks.map(date => parseFloat(timeSeries[date]['2. high'])))
        : null;

    // Average Volume
    const avgVolume = dates.length > 0
        ? dates.reduce((sum, date) => sum + parseInt(timeSeries[date][volumeKey] || 0), 0) / dates.length
        : null;

    return {
        previousClose,
        openPrice,
        dayLow,
        dayHigh,
        volume,
        adjustedClose,
        dividendAmount,
        splitCoefficient,
        weekLow,
        weekHigh,
        avgVolume
    };
}




/**
 * Format Market Capitalization to a readable format.
 * @param {number} value - Market capitalization value.
 * @returns {string} - Formatted market cap as a string.
 */
function formatMarketCap(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return ''; // Handle invalid or undefined input
    }

    if (value >= 1e12) {
        return (value / 1e12).toFixed(2) + 'T';
    } else if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + 'K';
    } else {
        return value.toString(); // Return the value as-is for smaller numbers
    }
}

export default App;