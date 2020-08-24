# MMM-AVStock
MagicMirror module for displaying stock price using the Alphavantage API.


## Screenshot
- `mode:table`  
![ScreenShot for Table](https://raw.githubusercontent.com/lavolp3/MMM-AVStock/master/avstock-table.PNG)

- `mode:ticker`  
![ScreenShot for Ticker](https://raw.githubusercontent.com/lavolp3/MMM-AVStock/master/avstock-ticker.PNG)


## UPDATES ##
** 2.0.0 **
- included Highcharts npm module for charts
- option to add chart (`mode: series` still available)
- improved API calls
- technicals (EMA or SMA)
- touch functions (choose stock chart, zoom in chart)

## Installation
```shell
cd ~/MagicMirror/modules
git clone https://github.com/lavolp3/MMM-AVStock
cd MMM-AVStock
npm install
```

## Alphavantage Key
Get your free API key here:
https://www.alphavantage.co/

Free account has a limit of quota (5 request per minute, 500 requests per day).  
Over the time Alphavantahge has shown to be unreliable, since more and more stocks and function got excluded.  
Currently several users (including me) only get stock data for the previous day.   
I am working on an alternative API.  



## Configuration

### Simple

```javascript
{
  //disabled:true,
  module: "MMM-AVStock",
  position: "top_left",
  config: {
    apiKey : "YOUR_ALPHAVANTAGE_KEY",
    symbols : ["AAPL", "GOOGL", "TSLA"],
  }
},
```

### Detailed

```javascript
{
    module: "MMM-AVStock",
    position: "top_right", //"bottom_bar" is better for `mode:ticker`
    config: {
        apiKey : "",
        timeFormat: "DD-MM HH:mm",
        width: '100%',
        symbols : ["AAPL", "GOOGL", "TSLA"],
        alias: ["APPLE", "GOOGLE", "TESLA"],
        locale: config.language,
        tickerDuration: 20,
        chartDays: 90,
        mode : "table",                  // "table" or "ticker"
        showChart: true,
        chartWidth: null,
        showVolume: true,
        chartInterval: "daily",          // choose from ["intraday", "daily", "weekly", "monthly"]
        movingAverage: {
            type: 'SMA',
            periods: [200]
        },
        decimals : 2,
        chartType: 'line',                // 'line', 'candlestick', or 'ohlc'
        chartLineColor: '#eee',
        chartLabelColor: '#eee',
        coloredCandles: true,
        debug: false
    }
},
```


## Configuration Options

| **Option** | **Type** | **Default** | **Description** |
| --- | --- | --- | --- |
| `api_key` | string | '' | Your API Key obtained from <https://www.alphavantage.co/> (limited to 500 requests a day)|
| `width` | string | '100%' | Width of the module |
| `timeFormat` | string | 'DD-MM HH:mm' | Format of dates to be shown. Use moment.js format style here |
| `symbols` | array | ["AAPL", "GOOGL", "TSLA"] | Array of stock symbols |
| `alias` | array | ["APPLE", "GOOGLE", "TESLA"] | Array of aliases to replace the stock symbol. Leave all or each empty to show the symbol. |
| `locale` | string | config.locale | Locale to convert numbers to the respective number format. |
| `tickerDuration` | integer | 20 | Determines ticker speed |
| `chartDays` | integer | 90 | Number of days to show in the chart. (Max 90 days!) |
| `mode` | string | 'table' | Use 'table' for table mode or 'ticker' for ticker mode. |
| `showChart` | boolean | true | Whether to show the chart. |
| `chartWidth` | integer | null | Determines width of chart |
| `chartInterval` | string | 'daily' | Chart interval. Currently only daily supported! |
| `showVolume` | boolean | true | Show volume bars in the chart. |
| `movingAverage` | object | `{ type: "SMA", periods: [200]}`  | movingAverages to include in the graph. Use `EMA` or `SMA` type and an array of all moving averages you want to see. Consider that every MA uses an own API call. |
| `decimals` | integer |  | Number of decimals. |
| `chartType` | string | `line` | Use `line`, `candlestick`, or `ohlc` |
| `chartLineColor` | string | `#eee` | Color of line chart |
| `chartLabelColor` | string | `#eee` | Color of chart labels |
| `coloredCandles` | boolean | true | Whether to use colored candles or OHLC bars. |
| `debug` | false | Debug mode: additional output on server side (console) and client side (browser) |


## ToDo

[ ] Use another API!
[ ] Grid view
