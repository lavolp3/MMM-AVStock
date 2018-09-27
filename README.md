# MMM-AVStock
MagicMirror module for displaying stock price with Alphavantage API


## Screenshot

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

This module is using a pooler to avoid the limit.



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
  position: "top_right",
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY", // https://www.alphavantage.co/
    timeFormat: "YYYY-MM-DD HH:mm:ss",
    symbols : ["aapl", "GOOGL", "005930.KS"],
    alias: ["APPLE", "", "SAMSUNG Electronics"], //Easy name of each symbol. When you use `alias`, the number of symbols and alias should be the same. If value is null or "", symbol string will be used by default.
    tickerDuration: 60, // Ticker will be cycled once per this second.
    chartDays: 90, //For `mode:series`, how much daily data will be taken. (max. 90)
    poolInterval : 1000*15, // If your AV account is free, at least 13 sec is needed.
    mode : "table", // "table", "ticker", "series"
  }
},
```
