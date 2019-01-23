# MMM-AVStock
MagicMirror module for displaying stock price with Alphavantage API


## Screenshot
- `mode:table`
![ScreenShot for Table](https://raw.githubusercontent.com/eouia/MMM-AVStock/master/sc_table.png)

- `mode:ticker`
![ScreenShot for Ticker](https://raw.githubusercontent.com/eouia/MMM-AVStock/master/sc_ticker.png)

- `mode:series`
![ScreenShot for Series](https://raw.githubusercontent.com/eouia/MMM-AVStock/master/sc_series.png)


## Installation
```shell
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-AVStock
cd MMM-AVStock
npm install
```

## Alphavantage Key
https://www.alphavantage.co/

Free account has a limit of quota (5 request per minute).

This module uses pooling to avoid this limit. Therefore, the first loading of each stock data will take some seconds(about 15sec per each stock).

If you have premium account, you can adjust `poolInterval` for shorter refreshing. 



## Configuration
### Simple
```javascript
{
  //disabled:true,
  module: "MMM-AVStock",
  position: "top_right",
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY",
    symbols : ["aapl", "GOOGL", "005930.KS"],
  }
},
```
### Details and Defaults Values
```javascript
{
  //disabled:true,
  module: "MMM-AVStock",
  position: "top_right", //"bottom_bar" is better for `mode:ticker`
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY", // https://www.alphavantage.co/
    timeFormat: "YYYY-MM-DD HH:mm:ss",
    symbols : ["aapl", "GOOGL", "005930.KS"],
    alias: ["APPLE", "", "SAMSUNG Electronics"], //Easy name of each symbol. When you use `alias`, the number of symbols and alias should be the same. If value is null or "", symbol string will be used by default.
    tickerDuration: 60, // Ticker will be cycled once per this second.
    chartDays: 90, //For `mode:series`, how much daily data will be taken. (max. 90)
    poolInterval : 1000*15, // If your AV account is free, at least 13 sec is needed.
    mode : "table", // "table", "ticker", "series"
    decimals: 4, // number o decimals for all values including decimals (prices, price changes, change%...)
  }
},
```
