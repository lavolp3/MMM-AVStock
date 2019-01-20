const request = require('request')
const moment = require("moment")

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
    this.config = null
    this.pooler = []
  },

  socketNotificationReceived: function(noti, payload) {
    if (noti == "INIT") {
      this.config = payload
      console.log("[AVSTOCK] Initialized.")
      this.startPooling()
    }

    if (noti == "START") {
      this.prepareScan()
    }
  },

  startPooling: function() {
    if (this.pooler.length > 0) {
      var symbol = this.pooler.shift()

      this.callAPI(this.config, symbol, (noti, payload)=>{
        this.sendSocketNotification(noti, payload)
      })
    } else {
      this.prepareScan()
    }

    var timer = setTimeout(()=>{
      this.startPooling()
    }, this.config.poolInterval)
  },

  callAPI: function(cfg, symbol, callback) {
    var url = ""
    if (cfg.mode != "series") {
      url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol="
    } else {
      url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol="
    }
    url += symbol + "&apikey=" + cfg.apiKey

    request(url, (error, response, body)=>{
      //console.log("[AVSTOCK] API is called - ", symbol)
      var data = null
      if (error) {
        console.log("[AVSTOCK] API Error: ", error)
        return
      }
      data = JSON.parse(body)
      if (data.hasOwnProperty("Information")) {
        console.log("[AVSTOCK] Error: API Call limit over.")
      }
      if (data.hasOwnProperty("Error Message")) {
        console.log("[AVSTOCK] Error:", data["Error Message"])
      }
      if (data["Global Quote"]) {
        if (!data["Global Quote"].hasOwnProperty("01. symbol")) {
          console.log("[AVSTOCK] Data Error: There is no available data for", symbol)
        }
        //console.log("[AVSTOCK] Response is parsed - ", symbol)
        var dF = Math.pow(10, 2)		//decimal Factor, converts decimals to numbers that needs to be multiplied for Math.round
        var result = {
          "symbol": data["Global Quote"]["01. symbol"],
          "open": (Math.round(parseFloat(data["Global Quote"]["02. open"])*dF))/dF,
          "high": (Math.round(parseFloat(data["Global Quote"]["03. high"])*dF))/dF,
          "low": (Math.round(parseFloat(data["Global Quote"]["04. low"])*dF))/dF,
          "price": (Math.round(parseFloat(data["Global Quote"]["05. price"])*dF))/dF,
          "volume": parseInt(data["Global Quote"]["06. volume"]).toLocaleString(),
          "day": data["Global Quote"]["07. latest trading day"],
          "close": (Math.round(parseFloat(data["Global Quote"]["08. previous close"])*dF))/dF,
          "change": (Math.round(parseFloat(data["Global Quote"]["09. change"])*dF))/dF,
          "changeP": (Math.round(parseFloat(data["Global Quote"]["10. change percent"])*dF))/dF+"%",
          "requestTime": moment().format(cfg.timeFormat),
          "hash": symbol.hashCode()
        }
        callback('UPDATE', result)
      } else if (data["Time Series (Daily)"]) {
        //console.log("[AVSTOCK] Response is parsed - ", symbol)
        var series = data["Time Series (Daily)"]
        var keys = Object.keys(series)
        var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays
        var keys = keys.sort().reverse().slice(0, dayLimit)
        var ts = []
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
          item.candle = ((item.close - item.open) >= 0) ? "up" : "down"
          ts.push(item)
        }
        callback('UPDATE_SERIES', ts)
      }
    })
  },

  prepareScan: function() {
    for (s in this.config.symbols) {
      var symbol = this.config.symbols[s]
      this.pooler.push(symbol)
    }
  },
})
