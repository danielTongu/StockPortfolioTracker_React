/**
 * File: App.js
 *
 * This React application provides an interactive platform for tracking and analyzing stock market data in real-time.
 *
 * Users can:
 *  -   Add up to 10 stocks to the dashboard for a comprehensive overview of their performance.
 *  -   View detailed information and visualizations for individual stocks.
 *  -   Analyze stock performance across multiple timeframes, such as daily, monthly, yearly, or custom durations.
 *  -   Leverage the Alpha Vantage API for accurate and up-to-date stock market data.
 */



import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import './App.css';





// Constants
const API_KEY = process.env.REACT_APP_API_KEY; // Environment variable saved on local machine
const MAX_STOCK_SYMBOL_LENGTH = 20; // User can key up to 20 characters on symbol search
const NUM_STOCKS = 10; // Maximum number of stocks
const LOCAL_STORAGE_KEY = 'stockTracker_stocks'; // Key for localStorage to retain stock symbols on page refresh





/**
 * The main App component.
 */
function App() {
    // State variables
    const [stockSymbols, setStockSymbols] = useState(Array(NUM_STOCKS).fill(null)); // Stores up to 10 stocks
    const [selectedStock, setSelectedStock] = useState(null); // Currently selected stock for detailed view
    const [timeFrame, setTimeFrame] = useState('1D'); // Selected time frame for data
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Controls visibility of the add stock dialog
    const [currentSlot, setCurrentSlot] = useState(null); // Slot index for adding or replacing a stock
    const [stockInput, setStockInput] = useState(''); // User input for stock symbol
    const [isLoading, setIsLoading] = useState(false); // Loading state for data fetching

    // Effect to load stocks from localStorage on component mount
    useEffect(() => { loadStoredStocks(setStockSymbols); }, []);

    // Effect to save stocks to localStorage whenever stockSymbols change
    useEffect(() => { saveStocksToLocalStorage(stockSymbols);}, [stockSymbols]);

    // Effect to fetch data when timeFrame changes and a stock is selected
    useEffect(() => { fetchSelectedStockData(selectedStock, timeFrame, setSelectedStock, setIsLoading); }, [timeFrame]);

    // Function to handle time frame selection
    function handleTimeFrameClick(period) { setTimeFrame(period); }

    // Render the component
    return (
        <div>
            <header>
                <div>
                    <h1>Stock {selectedStock ? 'Details' : 'Cards'}</h1>
                    <button
                        id="button-home"
                        onClick={() => showStocksGrid(setSelectedStock)}
                        style={{ display: selectedStock ? 'inline' : 'none' }}
                    >
                        <svg height="30" viewBox="0 0 24 24" width="30">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
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
                        onAddStock={(slotId) =>
                            openAddOrReplaceModal(slotId, setCurrentSlot, setIsDialogOpen, setStockInput)
                        }
                        onStockSelect={(stock) =>
                            handleStockClick(stock, timeFrame, setSelectedStock, setIsLoading)
                        }
                        onRemoveStock={(slotId) => handleRemoveStock(slotId, setStockSymbols)}
                    />
                )}
                {isDialogOpen && (
                    // Show StockDialog if dialog is open
                    <StockDialog
                        onSubmit={() =>
                            addOrReplaceStock({
                                stockInput,
                                stockSymbols,
                                currentSlot,
                                setStockSymbols,
                                closeAddModal: () => closeAddModal(setIsDialogOpen, setStockInput),
                                timeFrame,
                            })
                        }
                        onClose={() => closeAddModal(setIsDialogOpen, setStockInput)}
                        stockInput={stockInput}
                        handleStockInputChange={(event) => handleStockInputChange(event, setStockInput)}
                    />
                )}
            </main>
            <footer>
                <p>
                    ©<span id="current-year">{new Date().getFullYear()}</span> Group 2, CS480 Fall2024. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}





/**
 * Component representing the grid of stocks.
 * @param {object} props - Component properties.
 * @param {Array} props.stocks - Array of stock symbols.
 * @param {function} props.onAddStock - Function to add a stock.
 * @param {function} props.onStockSelect - Function to select a stock.
 * @param {function} props.onRemoveStock - Function to remove a stock.
 */
function Grid(props) {
    const { stocks, onAddStock, onStockSelect, onRemoveStock } = props;

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
                        onFetchDetails={() => onStockSelect(stock)}
                        onRemove={() => onRemoveStock(index)}
                        onReplace={onAddStock}
                    />
                );
            })}
        </ul>
    );
}





/**
 * Component representing a single stock slot in the grid.
 * @param {object} props - Component properties.
 * @param {number} props.slotId - The slot index.
 * @param {string} [props.symbol] - The stock symbol.
 * @param {string} [props.stockName] - The name of the stock.
 * @param {number} [props.price] - The current price of the stock.
 * @param {number} [props.change] - The percentage change in stock price.
 * @param {function} props.onAdd - Function to add a stock.
 * @param {function} props.onFetchDetails - Function to fetch stock details.
 * @param {function} props.onRemove - Function to remove a stock.
 * @param {function} props.onReplace - Function to replace a stock.
 */
function StockSlot(props) {
    const { slotId, symbol, stockName, price, change, onAdd, onFetchDetails, onRemove, onReplace } =
        props;

    const isStockAdded = Boolean(symbol);

    // Event handler for section click
    function handleSectionClick(e) {
        e.stopPropagation();
        onFetchDetails();
    }

    // Event handler for replace button
    function handleReplaceClick(e) {
        e.stopPropagation();
        onReplace(slotId);
    }

    // Event handler for remove button
    function handleRemoveClick(e) {
        e.stopPropagation();
        onRemove(slotId);
    }

    // Event handler for add button
    function handleAddClick() { onAdd(slotId); }

    return (
        <li
            data-slot-id={slotId}
            className={`${isStockAdded ? 'stock-slot' : 'empty-slot'}`}
            onClick={!isStockAdded ? handleAddClick : undefined}
        >
            {isStockAdded ? (
                <>
                    {/* If stock is added, show its details */}
                    <section onClick={handleSectionClick}>
                        <p className="stock-symbol">{symbol}</p>
                        <p className="stock-name">{stockName}</p>
                        <span className="current-price">{formatPrice(price)}</span>
                        <span className={`price-change ${getPriceChangeClass(change)}`}>
              {formatChangePercent(change)}
            </span>
                    </section>
                    {/* Replace and Remove buttons */}
                    <button
                        data-button-text="replace"
                        className="replace-button"
                        onClick={handleReplaceClick}
                    ></button>
                    <button className="button-close" onClick={handleRemoveClick}></button>
                </>
            ) : (
                <button className="add-button" onClick={handleAddClick}>
                    Add Stock
                </button>
            )}
        </li>
    );
}





/**
 * Component representing the add/replace stock dialog.
 * @param {object} props - Component properties.
 * @param {function} props.onSubmit - Function to submit the new stock symbol.
 * @param {function} props.onClose - Function to close the dialog.
 * @param {string} props.stockInput - Current value of the stock input field.
 * @param {function} props.handleStockInputChange - Handler for input field changes.
 */
function StockDialog(props) {
    const { onSubmit, onClose, stockInput, handleStockInputChange } = props;

    // Create a ref for the input field
    const inputRef = useRef(null);

    // Automatically focus on the input field when the dialog opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Handle keydown event for Enter key
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit(); // Trigger the submission
        }
    }

    return (
        <dialog id="add-stock-dialog" className={'open'}>
            <section>
                <button className="button-close" onClick={onClose}></button>
                <p>Add or Replace Stock</p>
                <input
                    id="stock-input"
                    type="text"
                    value={stockInput}
                    onChange={handleStockInputChange}
                    placeholder="Enter Stock Symbol"
                    ref={inputRef} // Attach the ref to the input
                    maxLength={MAX_STOCK_SYMBOL_LENGTH} // Set the maximum length
                    onKeyDown={handleKeyDown}
                />
                <div id="button-group">
                    <button data-button-text="ok" onClick={onSubmit}></button>
                    <button data-button-text="cancel" onClick={onClose}></button>
                </div>
            </section>
        </dialog>
    );
}





/**
 * Component representing the detailed view of a selected stock.
 * @param {object} props - Component properties.
 * @param {object} props.stockDetails - Detailed information about the selected stock.
 * @param {string} props.timeFrame - The currently selected time frame.
 * @param {function} props.handleTimeFrameClick - Function to handle time frame selection.
 * @param {boolean} props.isLoading - Loading state for data fetching.
 */
function StockDetails(props) {
    const { stockDetails, timeFrame, handleTimeFrameClick, isLoading } = props;

    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const additionalStatsRef = useRef([]);

    // Effect to render the chart when stockDetails change
    useEffect(() => {
        if (stockDetails && stockDetails.dates && stockDetails.timeSeries) {
            renderChart(stockDetails, canvasRef, chartRef, additionalStatsRef);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [stockDetails]);

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
                        <span className="current-price">{formatPrice(stockDetails.price)}</span>
                        <span className={`price-change ${getPriceChangeClass(stockDetails.changePercent)}`}>
              {formatChangePercent(stockDetails.changePercent)}
            </span>
                    </div>
                    <ul id="time-options">
                        {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((period) => (
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
                        {renderStat('Previous Close', formatPrice(stockDetails.previousClose))}
                        {renderStat('Open', formatPrice(stockDetails.openPrice))}
                        {renderStat("Day's Range", formatRange(stockDetails.dayLow, stockDetails.dayHigh))}
                        {renderStat('52 Week Range', formatRange(stockDetails.weekLow, stockDetails.weekHigh))}
                        {renderStat('Volume', formatNumber(stockDetails.volume))}
                        {renderStat('Avg. Volume', formatNumber(stockDetails.avgVolume))}
                        {renderStat('Market Cap (intraday)', formatMarketCap(stockDetails.marketCap))}
                        {renderStat('Beta (5Y Monthly)', formatNumber(stockDetails.beta, 2))}
                        {renderStat('PE Ratio (TTM)', formatNumber(stockDetails.peRatio, 2))}
                        {renderStat('EPS (TTM)', formatPrice(stockDetails.eps))}
                        {renderStat('1y Target Est.', formatPrice(stockDetails.targetEst))}
                        {renderStat('Dividend Amount', formatPrice(stockDetails.dividendAmount))}
                    </ul>
                </>
            )}
        </section>
    );
}





/**
 * Opens the add/replace stock dialog.
 * @param {number} slotId - The slot index for adding or replacing a stock.
 * @param {function} setCurrentSlot - Setter for currentSlot state.
 * @param {function} setIsDialogOpen - Setter for isDialogOpen state.
 * @param {function} setStockInput - Setter for stockInput state.
 */
function openAddOrReplaceModal(slotId, setCurrentSlot, setIsDialogOpen, setStockInput) {
    setCurrentSlot(slotId);
    setIsDialogOpen(true);
    setStockInput('');
}





/**
 * Closes the add stock dialog.
 * @param {function} setIsDialogOpen - Setter for isDialogOpen state.
 * @param {function} setStockInput - Setter for stockInput state.
 */
function closeAddModal(setIsDialogOpen, setStockInput) {
    setIsDialogOpen(false);
    setStockInput('');
}





/**
 * Handles changes in the stock input field.
 * @param {object} event - The event object from the input field.
 * @param {function} setStockInput - Setter for stockInput state.
 */
function handleStockInputChange(event, setStockInput) {
    const inputValue = event.target.value.toUpperCase();
    setStockInput(inputValue.slice(0, MAX_STOCK_SYMBOL_LENGTH)); // Enforce the max length
}





/**
 * Adds or replaces a stock in the grid.
 * @param {object} params - Parameters including state variables and setters.
 * @param {string} params.stockInput - The stock symbol input by the user.
 * @param {Array} params.stockSymbols - The current array of stock symbols.
 * @param {number} params.currentSlot - The slot index where the stock is to be added or replaced.
 * @param {function} params.setStockSymbols - Setter for stockSymbols state.
 * @param {function} params.closeAddModal - Function to close the add stock dialog.
 * @param {string} params.timeFrame - The current selected time frame.
 */
async function addOrReplaceStock({stockInput, stockSymbols, currentSlot, setStockSymbols, closeAddModal, timeFrame,}) {
    let resultMessage = ''; // Placeholder for return message
    let inputSymbol = stockInput.trim().toUpperCase();

    if (!inputSymbol) {
        resultMessage = 'Please enter a valid stock symbol.';
    } else if (
        stockSymbols.some(
            (stock, index) => stock && stock.symbol === inputSymbol && index !== currentSlot
        )
    ) {
        resultMessage = 'Duplicate stock symbol in another slot.';
        closeAddModal(); // Don't proceed with duplicates
    } else {
        try {
            const stockData = await fetchStockData({
                apiKey: API_KEY,
                query: inputSymbol,
                timeFrame: timeFrame,
            });

            if (stockData && stockData.symbol === inputSymbol) {
                setStockSymbols((prev) => {
                    const updatedSymbols = [...prev];
                    updatedSymbols[currentSlot] = stockData;
                    return updatedSymbols;
                });

                closeAddModal();
            } else {
                resultMessage = 'No data found for the provided stock symbol.';
            }
        } catch (error) {
            resultMessage = `Error fetching stock data: ${error.message}`;
        }
    }
    if (resultMessage) alert(resultMessage);
}





/**
 * Removes a stock from a slot.
 * @param {number} slotId - The slot index to remove the stock from.
 * @param {function} setStockSymbols - Setter for stockSymbols state.
 */
function handleRemoveStock(slotId, setStockSymbols) {
    setStockSymbols(function (prevSymbols) {
        let updatedSymbols = prevSymbols.slice();
        updatedSymbols[slotId] = null;
        return updatedSymbols;
    });
}





/**
 * Shows the stocks grid (hides details view).
 * @param {function} setSelectedStock - Setter for selectedStock state.
 */
function showStocksGrid(setSelectedStock) {
    setSelectedStock(null);
}






/**
 * Fetches data when timeFrame changes and a stock is selected.
 * @param {object} selectedStock - The currently selected stock.
 * @param {string} timeFrame - The selected time frame.
 * @param {function} setSelectedStock - Setter for selectedStock state.
 * @param {function} setIsLoading - Setter for isLoading state.
 */
function fetchSelectedStockData(selectedStock, timeFrame, setSelectedStock, setIsLoading) {
    if (selectedStock) {
        setIsLoading(true);
        fetchStockData({
            apiKey: API_KEY,
            query: selectedStock.symbol,
            timeFrame: timeFrame,
        })
            .then(function (stockData) {
                setSelectedStock(stockData);
                setIsLoading(false);
            })
            .catch(function (error) {
                console.error(error);
                alert(error.message);
                setIsLoading(false);
            });
    }
}





/**
 * Handles clicking on a stock in the grid to view details.
 * @param {object} stock - The stock that was clicked.
 * @param {string} timeFrame - The current selected time frame.
 * @param {function} setSelectedStock - Setter for selectedStock state.
 * @param {function} setIsLoading - Setter for isLoading state.
 */
async function handleStockClick(stock, timeFrame, setSelectedStock, setIsLoading) {
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





/**
 * Loads stocks from localStorage on component mount.
 * @param {function} setStockSymbols - Setter for stockSymbols state.
 */
function loadStoredStocks(setStockSymbols) {
    const storedStocks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedStocks) {
        try {
            const parsedStocks = JSON.parse(storedStocks);
            // Ensure the parsed data is an array with a maximum length of NUM_STOCKS
            if (Array.isArray(parsedStocks)) {
                setStockSymbols((prev) => {
                    const updatedSymbols = [...prev];
                    parsedStocks.slice(0, NUM_STOCKS).forEach((stock, index) => {
                        updatedSymbols[index] = stock;
                    });
                    return updatedSymbols;
                });
            }
        } catch (error) {
            console.error('Failed to parse stored stocks:', error);
            // Optionally, you can clear the invalid data
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }
}





/**
 * Saves stocks to localStorage whenever stockSymbols change.
 * @param {Array} stockSymbols - The current array of stock symbols.
 */
function saveStocksToLocalStorage(stockSymbols) {
    try {
        const stocksToStore = stockSymbols.filter((stock) => stock !== null);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stocksToStore));
    } catch (error) {
        console.error('Failed to save stocks to localStorage:', error);
    }
}





/**
 * Renders the stock chart using Chart.js.
 * @param {object} data - The stock data.
 * @param {object} canvasRef - Reference to the canvas element.
 * @param {object} chartRef - Reference to the Chart.js instance.
 * @param {object} additionalStatsRef - Reference to additional stats for tooltips.
 */
function renderChart(data, canvasRef, chartRef, additionalStatsRef) {
    const ctx = canvasRef.current.getContext('2d');

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
            adjustedClose: dataPoint['5. adjusted close']
                ? parseFloat(dataPoint['5. adjusted close'])
                : null,
            dividendAmount: dataPoint['7. dividend amount']
                ? parseFloat(dataPoint['7. dividend amount'])
                : null,
            splitCoefficient: dataPoint['8. split coefficient']
                ? parseFloat(dataPoint['8. split coefficient'])
                : null,
            volume: parseInt(dataPoint[data.volumeKey]),
        };
    });

    const { borderColor, backgroundColor } = getOverallColor(data.timeSeries, data.dates);

    chartRef.current = new Chart(ctx, {
        type: 'line',

        data: {
            labels: data.dates,
            datasets: [
                {
                    label: `${data.symbol} Price`,
                    data: prices,
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    fill: true,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: borderColor,
                    tension: 0.1, // Smooth curves
                },
            ],
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: data.timeUnit },
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#1f1f1f',
                        font: { size: 20 },
                    },
                    grid: {
                        color: 'rgb(31,31,31)',
                        drawOnChartArea: true,
                        drawTicks: true,
                    },
                    ticks: {
                        color: '#e0e0e0',
                        maxTicksLimit: data.ticks,
                        autoSkip: true,
                    },
                },

                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price',
                        color: '#1f1f1f',
                        font: { size: 20 },
                    },
                    grid: {
                        color: 'rgb(31,31,31)',
                        drawOnChartArea: true,
                        drawTicks: true,
                    },
                    ticks: {
                        color: '#e0e0e0',
                        callback: function (value) {
                            return formatPrice(value);
                        },
                    },
                },
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

                            if (!stat) { return 'Loading data. Click another timeline tab, then revisit this.'; }

                            return [
                                `Close: ${formatPrice(stat.close)}`,
                                `Open: ${formatPrice(stat.open)}`,
                                `High: ${formatPrice(stat.high)}`,
                                `Low: ${formatPrice(stat.low)}`,
                                `Volume: ${stat.volume.toLocaleString()}`,
                            ];
                        },
                    },
                },

                legend: {
                    labels: { color: '#1f1f1f' },
                },
            },
        },
    });
}




/**
 * Determines the color for the chart based on overall percentage change.
 * @param {object} timeSeries - The time series data.
 * @param {Array} dates - Array of dates.
 * @returns {object} - Contains borderColor and backgroundColor.
 */
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
    return { borderColor, backgroundColor };
}





/**
 * Helper function to render a single stat.
 * @param {string} label - The label of the stat.
 * @param {string|number|null} value - The value of the stat.
 * @returns {JSX.Element} - The rendered <li> element.
 */
function renderStat(label, value) {
    return (
        <li key={label} data-stat={label}>
            {value !== null && value !== undefined ? value : 'N/A'}
        </li>
    );
}





/**
 * Format a price value.
 * @param {number|null} price - The price to format.
 * @returns {string} - Formatted price.
 */
function formatPrice(price) {
    return price !== null && price !== undefined ? `${price.toFixed(2)}` : 'N/A';
}





/**
 * Format a percentage change value.
 * @param {number|null} changePercent - The percentage change.
 * @returns {string} - Formatted percentage change.
 */
function formatChangePercent(changePercent) {
    return changePercent !== null && changePercent !== undefined
        ? `${changePercent.toFixed(2)}`
        : '0.00';
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
    return 'N/A';
}






/**
 * Format a number with optional decimal places.
 * @param {number|null} value - The number to format.
 * @param {number} [decimals=0] - Number of decimal places.
 * @returns {string} - Formatted number.
 */
function formatNumber(value, decimals = 0) {
    return value !== null && value !== undefined
        ? value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
        : 'N/A';
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
 * Fetches stock data including time series and overview information.
 * @param {Object} params - Parameters for fetching stock data.
 * @param {string} params.apiKey - Alpha Vantage API key.
 * @param {string} params.query - Stock symbol to query.
 * @param {string} params.timeFrame - Time frame for the data.
 * @returns {Object} - Stock data including various statistics.
 */
async function fetchStockData(params) {
    const { apiKey, query, timeFrame } = params;

    try {
        // Use the helper function to search for the stock symbol
        const { symbol, name } = await searchSymbol(apiKey, query);

        // Get parameters for the selected time frame
        const timeFrameParams = getTimeFrameParams(timeFrame);
        const { endpoint, interval, dateRange, timeUnit, ticks } = timeFrameParams;

        // Determine the volume key based on the endpoint
        const volumeKey = endpoint.includes('ADJUSTED') ? '6. volume' : '5. volume';

        // Build the API URL based on the endpoint
        const url =
            endpoint === 'TIME_SERIES_INTRADAY'
                ? `https://www.alphavantage.co/query?function=${endpoint}&symbol=${symbol}&interval=${interval}&apikey=${apiKey}&outputsize=full`
                : `https://www.alphavantage.co/query?function=${endpoint}&symbol=${symbol}&apikey=${apiKey}&outputsize=full`;

        // Fetch the time series data
        const response = await fetch(url);
        const data = await response.json();

        const timeSeriesKeyMap = {
            TIME_SERIES_INTRADAY: `Time Series (${interval})`,
            TIME_SERIES_DAILY: 'Time Series (Daily)',
            TIME_SERIES_DAILY_ADJUSTED: 'Time Series (Daily)',
            TIME_SERIES_WEEKLY: 'Weekly Time Series',
            TIME_SERIES_WEEKLY_ADJUSTED: 'Weekly Adjusted Time Series',
            TIME_SERIES_MONTHLY: 'Monthly Time Series',
            TIME_SERIES_MONTHLY_ADJUSTED: 'Monthly Adjusted Time Series',
        };

        const timeSeriesKey = timeSeriesKeyMap[endpoint];
        const timeSeries = data[timeSeriesKey];

        if (!timeSeries) {
            throw new Error(`Time series data unavailable for "${timeFrame}".`);
        }

        // Get dates for the chart
        const allDates = Object.keys(timeSeries);
        let dates;

        const currentDate = new Date();

        if (timeFrame === '1D') {
            const past24Hours = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past24Hours;
                })
                .reverse(); // Chronological order

            // If no data is available in the last 24 hours (e.g., weekends), use the most recent available data
            if (dates.length === 0) {
                dates = allDates.slice(0, 96).reverse(); // Approximate data points for 2 days at 15min intervals
            }
        } else if (timeFrame === '5D') {
            const past5Days = new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past5Days;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === '1M') {
            const past1Month = new Date();
            past1Month.setMonth(past1Month.getMonth() - 1);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past1Month;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === '6M') {
            const past6Months = new Date();
            past6Months.setMonth(past6Months.getMonth() - 6);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past6Months;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === 'YTD') {
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= startOfYear;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === '1Y') {
            const past1Year = new Date();
            past1Year.setFullYear(past1Year.getFullYear() - 1);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past1Year;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === '5Y') {
            const past5Years = new Date();
            past5Years.setFullYear(past5Years.getFullYear() - 5);
            dates = allDates
                .filter((dateStr) => {
                    const date = new Date(dateStr);
                    return date >= past5Years;
                })
                .reverse(); // Chronological order
        } else if (timeFrame === 'ALL') {
            dates = allDates.reverse(); // Chronological order
        } else {
            const slicedDates = dateRange === Infinity ? allDates : allDates.slice(0, dateRange);
            dates = slicedDates.reverse(); // Chronological order
        }

        // Fetch overview data
        const overviewData = await fetchStockOverview(apiKey, symbol);

        // Extract PE Ratio and Market Cap
        const peRatio = overviewData['PERatio'] ? parseFloat(overviewData['PERatio']) : null;
        const marketCap = overviewData['MarketCapitalization']
            ? parseFloat(overviewData['MarketCapitalization'])
            : null;

        // Extract additional stats if available
        const beta = overviewData['Beta'] ? parseFloat(overviewData['Beta']) : null;
        const eps = overviewData['EPS'] ? parseFloat(overviewData['EPS']) : null;
        const earningsDate = overviewData['EarningsDate'] || null; // Format as per API
        const targetEst = overviewData['AnalystTargetPrice']
            ? parseFloat(overviewData['AnalystTargetPrice'])
            : null;

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
            marketCap,
        };
    } catch (error) {
        console.error('Error while fetching stock data:', error.message || error);
        throw new Error(
            `Could not fetch data for "${query}": ${error.message || 'Please try again later.'}`
        );
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
    return { symbol, name };
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
            interval = '15min';
            dateRange = undefined; // We'll filter dates within the past 24 hours
            timeUnit = 'hour';
            ticks = 24; // 24 hours
            break;

        case '5D':
            endpoint = 'TIME_SERIES_INTRADAY';
            interval = '60min';
            dateRange = undefined; // We'll filter dates within the past 5 days
            timeUnit = 'day';
            ticks = 5;
            break;

        case '1M':
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            dateRange = undefined; // We'll filter dates within the past 1 month
            timeUnit = 'day';
            ticks = 22; // Approximate trading days in a month
            break;

        case '6M':
            endpoint = 'TIME_SERIES_DAILY_ADJUSTED';
            dateRange = undefined; // We'll filter dates within the past 6 months
            timeUnit = 'month';
            ticks = 6; // 6 months
            break;

        case 'YTD':
            timeUnit = 'month';
            ticks = new Date().getMonth() + 1; // Number of months since start of year
            endpoint = 'TIME_SERIES_WEEKLY_ADJUSTED';
            break;

        case '1Y':
            endpoint = 'TIME_SERIES_WEEKLY_ADJUSTED';
            dateRange = undefined; // We'll filter dates within the past 12 months
            timeUnit = 'month';
            ticks = 12;
            break;

        case '5Y':
            endpoint = 'TIME_SERIES_WEEKLY_ADJUSTED';
            dateRange = undefined; // We'll filter dates within the past 5 years
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

    return { endpoint, interval, timeUnit, dateRange, ticks };
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
            avgVolume: null,
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
    const adjustedClose =
        latestData && latestData['5. adjusted close'] !== undefined
            ? parseFloat(latestData['5. adjusted close'])
            : null;

    // Dividend Amount
    const dividendAmount =
        latestData && latestData['7. dividend amount'] !== undefined
            ? parseFloat(latestData['7. dividend amount'])
            : null;

    // Split Coefficient
    const splitCoefficient =
        latestData && latestData['8. split coefficient'] !== undefined
            ? parseFloat(latestData['8. split coefficient'])
            : null;

    // 52-week Range
    const past52Weeks = Object.keys(timeSeries).slice(-260); // Approximately 260 trading days in 52 weeks

    const weekLow =
        past52Weeks.length > 0
            ? Math.min(...past52Weeks.map((date) => parseFloat(timeSeries[date]['3. low'])))
            : null;

    const weekHigh =
        past52Weeks.length > 0
            ? Math.max(...past52Weeks.map((date) => parseFloat(timeSeries[date]['2. high'])))
            : null;

    // Average Volume
    const avgVolume =
        dates.length > 0
            ? dates.reduce((sum, date) => sum + parseInt(timeSeries[date][volumeKey] || 0), 0) /
            dates.length
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
        avgVolume,
    };
}

export default App;