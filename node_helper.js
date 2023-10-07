const yfinance2 = require('yahoo-finance2').default;
const moment = require('moment');

var NodeHelper = require("node_helper")

String.prototype.hashCode = function() {
  var hash = 0
  if (this.length == 0) {
    return hash
  }
  for (var i = 0; i < this.length; i++) {
    var char = this.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash
  }
  return hash
}

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.initial = true;
        this.stocks = {};
        this.isrunning = false;
    },


    socketNotificationReceived: function(noti, payload) {
        if (noti == "INIT" && !this.isRunning) {
            this.config = payload;
            //this.alpha = require('alphavantage')({ key: this.config.apiKey });
            console.log("[AVSTOCK] Initialized.");
        } else if (noti == "GET_STOCKDATA") {
            this.config = payload;
            this.log("Performing stock API calls...");
            this.callAPI(this.config.symbols);
            var interval = this.config.callInterval
            this.log("Interval: " + Math.round(interval/1000));
            /*var self = this;
            clearInterval(this.callInterval); 
            this.callInterval = setInterval(() => {
                self.callAPI(this.config.symbols);
            }, interval);*/
        }
    },


    prepareAPICalls: function(callArray) {
        var callArray = [];
        var conf = this.config;
        var symbol, func, interval, maPeriod;
        var ma = conf.movingAverage;
        for (var s = 0; s < conf.symbols.length; s++) {
            func =  (conf.mode == "series") ? conf.chartInterval : "daily";
            symbol = conf.symbols[s];
            this.stocks[symbol]= {};
            idInterval = (func == "intraday") ? conf.intraDayInterval : "";
            callArray.push({
                symbol: symbol,
                func: func,
                interval: idInterval,
                ma: []
            });
            this.stocks[symbol][func] = {};
            if (ma.type != "") {
                this.stocks[symbol][ma.type] = {};
                interval = conf.chartInterval;
                for (m = 0; m < ma.periods.length; m++) {
                    callArray.push({
                        symbol: symbol,
                        func: "technical",
                        interval: interval,
                        ma: [ma.type, ma.periods[m]]
                    });
                }
            }
        }
        this.log("API Calls prepared...");
        this.log(callArray);
        this.log(this.stocks);
        return callArray;
    },

    
    /*regularCalls: function(callArray) {
        var counter = 0;
        this.log("Performing regular calls...");
        var interval = Math.round((24 * 60 * 60 * 1000) / (450 - callArray.length));          //500 calls allowed in 24 hours
        this.log("Interval: " + Math.round(interval/1000));
        var self = this;
        this.callAPI(callArray[0]);
        this.rc = setInterval(() => {
            counter = (counter == callArray.length-1) ? 0 : (counter + 1);
            self.callAPI(callArray[counter]);
            self.log("Counter: " + counter);
        }, interval);
    },*/

    
    callAPI: async function(symbols) {
        var self = this;
        for (var i = 0; i < symbols.length; i++) {
            var stock = {};
            this.log("Calling quote for stock: " + symbols[i])
            try {
		        stock.quotes = await yfinance2.quoteSummary(symbols[i], {modules: ['price']});
	        } catch (error) {
				stock.quotes = "";
				console.error("Error in loading quote data for Symbol "+symbols[i])
			};
            try {
				stock.historical = await yfinance2._chart(symbols[i], {period1: moment().subtract(60, 'days').format('YYYY-MM-DD')});
            } catch (error) {
				stock.historical = "";
				console.error("Error in loading historical data for Symbol "+symbols[i])
			};
			this.log(stock);
            self.sendSocketNotification("UPDATE_STOCK", stock);
        }
    },


    /*processData: function(data, callItem) {
        this.log("Processing API data...");
        var cfg = this.config;
        for (var key in data) {
            if (key.includes("Global Quote")) {
                this.log("Global Quote found for " + callItem.symbol);
                var quote = data[key];
                this.log(quote);
                var result = {
                    symbol: callItem.symbol,
                    open: parseFloat(quote["02. open"]),
                    high: parseFloat(quote["03. high"]),
                    low: parseFloat(quote["04. low"]),
                    price: parseFloat(quote["05. price"]),
                    volume: parseInt(quote["06. volume"]),
                    day: quote["07. latest trading day"],
                    close: parseFloat(quote["08. previous close"]),
                    change: parseFloat(quote["09. change"]),
                    changeP: quote["09. change"]*100/quote["08. previous close"]+'%',
                    up: (parseFloat(quote["09. change"]) > 0),
                    requestTime: moment().format(cfg.timeFormat),
                    hash: callItem.symbol.hashCode()
                };
                this.log(result);
                this.log("Sending socket notification with result: " + JSON.stringify(result));
                this.sendSocketNotification("UPDATE_QUOTE", {
                    symbol: callItem.symbol, 
                    func: callItem.func, 
                    data: result 
                });
            } else if (key.includes("Time Series")) {
                this.log("Time Series found...");
                var series = data[key];
                var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays;
                var entries = Object.keys(series).slice(0, dayLimit);
                var ts = [];
                entries.forEach(entry => {
                    var item = {
                        symbol: callItem.symbol,
                        date: entry,
                        open: parseFloat(series[entry]["1. open"]),
                        high: parseFloat(series[entry]["2. high"]),
                        low: parseFloat(series[entry]["3. low"]),
                        close: parseFloat(series[entry]["4. close"]),
                        volume: parseInt(series[entry]["5. volume"]),
                        hash: callItem.symbol.hashCode(),
                        requestTime: moment().format(cfg.timeFormat),
                        candle: null
                    }
                    item.candle = ((item.close - item.open) >= 0) ? "up" : "down";
                    ts.push(item);
                });
                ts[0].up = (ts[0].close > ts[1].close);
                ts[0].change = ts[0].close - ts[1].close;
                ts[0].changeP = ts[0].change*100/ts[1].close;
                this.log("Sending Socket Notification for series...");
                this.sendSocketNotification("UPDATE_STOCK", {
                    symbol: callItem.symbol, 
                    func: callItem.func, 
                    data: ts 
                });
            } else if (key.includes("Technical Analysis")) {
                this.log("Technical analysis data found...");
                var series = data[key];
                var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays;
                var entries = Object.keys(series).slice(0, dayLimit);
                var techSeries = [];
                entries.forEach(entry => {
                    var item = [
                        parseInt(moment(entry).format('x')), 
                        parseFloat(series[entry][callItem.ma[0].toUpperCase()])
                    ];
                    techSeries.push(item);
                });
                //this.log(techSeries);
                this.log("Sending Socket Notification...");
                this.sendSocketNotification("UPDATE_TECH", {
                    symbol: callItem.symbol, 
                    func: callItem.ma.join(''),
                    data: techSeries
                });
            }
        }             
    },*/
    
      
    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    },
})
