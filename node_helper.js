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
        this.pooler = [];
        this.doneFirstPooling = false;
    },

    socketNotificationReceived: function(noti, payload) {
        if (noti == "INIT") {
            this.config = payload;
            console.log("[AVSTOCK] Initialized.");
        } else if (noti == "START") {
            if (this.pooler.length == 0) {
                this.prepareScan();
            }
            this.startPooling();
        }
    },

    startPooling: function() {
        // Since December 2018, Alphavantage changed API quota limit.(500 per day)
        // So, fixed interval is used. for the first cycle, 15sec is used.
        // After first cycle, 3min is used for interval to match 500 quota limits.
        // So, one cycle would be 3min * symbol length;
        var interval = 0;
        if (this.config.premiumAccount) {
            interval = this.config.poolInterval;
        } else {
            interval = (this.doneFirstPooling) ? 180000 : 15000;
        };

        if (this.pooler.length > 0) {
            var symbol = this.pooler.shift();
            this.callAPI(this.config, symbol, (noti, payload)=>{
                this.sendSocketNotification(noti, payload);
            })
        } else {
            this.doneFirstPooling = true;
            this.prepareScan();
        }

        var timer = setTimeout(()=>{
            this.startPooling();
        }, interval)
    },

    callAPI: function(cfg, symbol, callback) {
        var url = "";
        if (cfg.mode != "series") {
            url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=";
        } else {
            url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=";
        }
        url += symbol + "&apikey=" + cfg.apiKey;
        this.log("Calling url : " + url);

        request(url, (error, response, body)=>{
            var data = null;
            if (error) {
                console.error("[AVSTOCK] API Error: ", error);
                return;
            }
            data = JSON.parse(body);
            //his.log("Received data: " + JSON.stringify(data));
            if (data.hasOwnProperty("Note")) {
                console.error("[AVSTOCK] Error: API Call limit exceeded.");
            } else if (data.hasOwnProperty("Error Message")) {
                console.error("[AVSTOCK] Error:", data["Error Message"]);
            } else if (data["Global Quote"]) {
                if (!data["Global Quote"].hasOwnProperty("01. symbol")) {
                    console.log("[AVSTOCK] Data Error: There is no available data for " + symbol);
                } else {
                    this.log("[AVSTOCK] Response is parsed for " + symbol);
                    var dec = Math.pow(10, this.config.decimals)		
                    var result = {
                        "symbol": data["Global Quote"]["01. symbol"],
                        "open": Math.round(parseFloat(data["Global Quote"]["02. open"]) * dec) / dec,
                        "high": Math.round(parseFloat(data["Global Quote"]["03. high"]) * dec) / dec,
                        "low": Math.round(parseFloat(data["Global Quote"]["04. low"]) * dec) / dec,
                        "price": Math.round(parseFloat(data["Global Quote"]["05. price"]) * dec) / dec,
                        "volume": parseInt(data["Global Quote"]["06. volume"]).toLocaleString(),
                        "day": data["Global Quote"]["07. latest trading day"],
                        "close": Math.round(parseFloat(data["Global Quote"]["08. previous close"]) * dec) / dec,
                        "change": Math.round(parseFloat(data["Global Quote"]["09. change"]) * dec) / dec,
                        "changeP": Math.round(parseFloat(data["Global Quote"]["10. change percent"]) * dec) / dec + "%",
                        "requestTime": moment().format(cfg.timeFormat),
                        "hash": symbol.hashCode()
                    }
                    this.log("Sending result: " + JSON.stringify(result));
                    callback('UPDATE', result);
                }
            } else if (data["Time Series (Daily)"]) {
                this.log("[AVSTOCK] Response is parsed for " + symbol)
                var series = data["Time Series (Daily)"];
                var keys = Object.keys(series);
                var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays;
                var keys = keys.sort().reverse().slice(0, dayLimit);
                var ts = [];
                for (k in keys) {
                    var index = keys[k]
                    var item = {
                        "symbol": symbol,
                        "date": index,
                        "open": series[index]["1. open"],
                        "high": series[index]["2. high"],
                        "low": series[index]["3. low"],
                        "close": series[index]["4. close"],
                        "volume": series[index]["5. volume"],
                        "hash" : symbol.hashCode(),
                        "requestTime": moment().format(cfg.timeFormat),
                        "candle": null
                    }
                    item.candle = ((item.close - item.open) >= 0) ? "up" : "down";
                    ts.push(item);
                }
                this.log("Sending result: " + JSON.stringify(ts));
                callback('UPDATE_SERIES', ts);
            }
        })
    },

    prepareScan: function() {
        for (s in this.config.symbols) {
            var symbol = this.config.symbols[s];
            this.pooler.push(symbol);
        }
    },
      
    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    },
})
