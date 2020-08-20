# MMM-AVStock
MagicMirror module for displaying stock price using the Alphavantage API.


## Screenshot
- `mode:table`
![ScreenShot for Table](https://raw.githubusercontent.com/eouia/MMM-AVStock/master/sc_table.png)

- `mode:ticker`
![ScreenShot for Ticker](https://raw.githubusercontent.com/eouia/MMM-AVStock/master/sc_ticker.png)


## UPDATES ##
** 2.0.0 **
- included Highcharts npm module for charts
- option to add chart (instead of mode: series)
- improved API calls
- 

## Installation
```shell
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-AVStock
cd MMM-AVStock
npm install
```

## Alphavantage Key
https://www.alphavantage.co/

Free account has a limit of quota (5 request per minute, 500 requests per day).



## Configuration
### Simple
```javascript
{
  //disabled:true,
  module: "MMM-AVStock",
  position: "top_right",
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY",
    symbols : ["aapl", "GOOGL", "TSLA"],
  }
},
```
### Details and Defaults Values
```javascript
{
  module: "MMM-AVStock",
  position: "top_right", //"bottom_bar" is better for `mode:ticker`
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY", // https://www.alphavantage.co/
    timeFormat: "YYYY-MM-DD HH:mm:ss",
    symbols : ["aapl", "GOOGL", "005930.KS"],
    alias: ["APPLE", "", "SAMSUNG Electronics"], //Easy name of each symbol. When you use `alias`, the number of symbols and alias should be the same. If value is null or "", symbol string will be used by default.
    tickerDuration: 60, // Ticker will be cycled once per this second.
    chartDays: 90, //For `mode:series`, how much daily data will be taken. (max. 90)
    poolInterval : 1000*15, // (Changed in ver 1.1.0) - Only For Premium Account
    mode : "table", // "table", "ticker", "series"
    decimals: 4, // number o decimals for all values including decimals (prices, price changes, change%...)
    candleSticks : false, //show candle sticks if mode is Series
    coloredCandles : false, //colored bars: red and green for negative and positive candles
    premiumAccount: false, // To change poolInterval, set this to true - Only For Premium Account
  }
},
```
