const request = require('request');
const moment = require('moment');

var NodeHelper = require("node_helper");

String.prototype.hashCode = function() {
    var hash = 0
    if (this.length == 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;
    }
    return hash;
}

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.initial = true;
        this.stocks = {};
    },


    socketNotificationReceived: function(noti, payload) {
        if (noti == "INIT") {
            this.config = payload;
            this.alpha = require('alphavantage')({ key: this.config.apiKey });
            console.log("[AVSTOCK] Initialized.");
            //this.startPooling();             
        } else if (noti == "GET_STOCKDATA") {
              //if ( moment().isAfter(moment(this.config.inactive[0], "HH:mm")) || moment().isBefore(moment(this.config.inactive[1], "HH:mm"))) {
              //  this.log("Inactivity time. No Api calls between "+this.config.inactive[0]+" and "+this.config.inactive[1]);
              //} else {
            //var inactivity = moment.duration();  //NOT FINISHED
            var callArray = this.prepareAPICalls();
            if (this.initial) {
                this.initialCalls(callArray);
            } else {
                this.regularCalls(callArray);
            }
        }
    },


    prepareAPICalls: function(callArray) {
        var callArray = [];
        var conf = this.config;
        var symbol, func, interval, maPeriod;
        var ma = conf.movingAverage;
        for (var s = 0; s < conf.symbols.length; s++) {
            func =  (conf.mode == "series") ? conf.chartInterval : "quote";
            symbol = conf.symbols[s];
            this.stocks[symbol]= {};
            interval = (func == "intraday") ? conf.intraDayInterval : "";
            callArray.push({
                symbol: symbol,
                func: func,
                interval: interval,
                ma: []
            });
            this.stocks[symbol][func] = {};
            if (conf.mode == "series" && ma.type != "") {
                maType = ma.type;
                this.stocks[symbol][maType] = {};
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


    initialCalls: function(callArray) {
        this.log("Performing initial 15s calls...");
        var interval = 15000;
        var self = this;
        this.callAPI(callArray[0]);
        var counter = 0;
        var ic = setInterval(() => {
            counter = counter + 1;
            if (counter == callArray.length) {
                clearInterval(ic);
                self.initial = false;
                self.regularCalls(callArray);
            } else {
                self.callAPI(callArray[counter]);
            }
        }, interval);
    },

    
    regularCalls: function(callArray) {
        var counter = 0;
        this.log("Performing regular calls...");
        var interval = Math.round((24 * 60 * 60 * 1000) / (450 - callArray.length));          //500 calls allowed in 24 hours
        var self = this;
        this.callAPI(callArray[0]);
        setInterval(() => {
            counter = (counter == callArray.length) ? 0 : counter + 1;
            self.callAPI(callArray[counter]);
            self.log("Counter: " + counter);
        }, interval);
    },

    
    callAPI: function(callItem) {
        var func = callItem.func;
        var interval = callItem.interval;
        this.log("Calling API: " + func + ", stock: " + callItem.symbol);
        if (["daily", "weekly", "monthly", "intraday", "quote"].includes(func)) {
            if (func == "intraday") {
                this.alpha.data[func](callItem.symbol, "compact", "json", callItem.interval)
                .then(data => {
                    this.processData(data, callItem);
                })
                .catch(error => {
                    console.error("[MMM-AVStock] ERROR: " + JSON.stringify(error));
                });
            } else {
                this.alpha.data[func](callItem.symbol, "compact", "json")
                .then(data => {
                    this.processData(data, callItem);
                })
                .catch(error => {
                    console.error("[MMM-AVStock] ERROR: " + JSON.stringify(error));
                });
            }
        } else if (func == "technical") {
            this.alpha.technical[callItem.ma[0].toLowerCase()](callItem.symbol, callItem.interval, callItem.ma[1], "close")
            .then(data => {
                this.processData(data, callItem);
            });
        }
    },
    

    processData: function(data, callItem) {
        this.log("Processing API data...");
        var cfg = this.config;
        for (var key in data) {
            if (key.includes("Global Quote")) {
                this.log("Global Quote found for " + callItem.symbol);
                this.log(data);
                var quote = data[key];
                var result = {
                    "symbol": callItem.symbol,
                    "open": parseFloat(quote["02. open"]),
                    "high": parseFloat(quote["03. high"]),
                    "low": parseFloat(quote["04. low"]),
                    "price": parseFloat(quote["05. price"]),
                    "volume": parseInt(quote["06. volume"]),
                    "day": quote["07. latest trading day"],
                    "close": parseFloat(quote["08. previous close"]),
                    "change": parseFloat(quote["09. change"]),
                    "changeP": parseFloat(quote["10. change percent"]),
                    "requestTime": moment().format(cfg.timeFormat),
                    //"hash": symbol.hashCode()
                }
                this.log("Sending socket notification with result: " + JSON.stringify(result));
                this.sendSocketNotification("UPDATE_STOCKS", {
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
                        "symbol": callItem.symbol,
                        "date": entry,
                        "open": parseFloat(series[entry]["1. open"]),
                        "high": parseFloat(series[entry]["2. high"]),
                        "low": parseFloat(series[entry]["3. low"]),
                        "close": parseFloat(series[entry]["4. close"]),
                        "volume": parseInt(series[entry]["5. volume"]),
                        "hash" : callItem.symbol.hashCode(),
                        "requestTime": moment().format(cfg.timeFormat),
                        "candle": null
                    }
                    item.candle = ((item.close - item.open) >= 0) ? "up" : "down";
                    ts.push(item);
                });
                this.log("Sending Socket Notification...");
                this.sendSocketNotification("UPDATE_STOCKS", {
                    symbol: callItem.symbol, 
                    func: callItem.func, 
                    data: ts 
                });
            } else if (key.includes("Technical Analysis")) {
                this.log("Technical analysis data found...");
                var series = data[key];
                var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays;
                var entries = Object.keys(series).slice(0, dayLimit);
                var ts = [];
                entries.forEach(entry => {
                    var item = {
                        "symbol": callItem.symbol,
                        "date": entry,
                        "ma": callItem.ma[0].toUpperCase(),
                        "value": series[entry][callItem.ma[0].toUpperCase()]
                    }
                    ts.push(item);
                });
                //this.log(ts);
                this.log("Sending Socket Notification...");
                this.sendSocketNotification("UPDATE_TECH", {
                    symbol: callItem.symbol, 
                    func: callItem.ma.join(''),
                    data: ts 
                });
            }
        }             
    },   
    
      
    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    },
})
