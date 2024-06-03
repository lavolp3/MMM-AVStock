const yfinance2 = require('yahoo-finance2').default;
const moment = require('moment');

var NodeHelper = require("node_helper")


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
            console.log("[MMM-AVStock] Initialized.");
        } else if (noti == "GET_STOCKDATA") {
            this.config = payload;
            this.log("Performing stock API calls...");
            this.callAPI(this.config);
            var interval = this.config.callInterval
            this.log("Interval: " + Math.round(interval/1000));
            /*var self = this;
            clearInterval(this.callInterval); 
            this.callInterval = setInterval(() => {
                self.callAPI(this.config.symbols);
            }, interval);*/
        }
    },

    
    callAPI: async function(cfg) {
        var self = this;
        for (var i = 0; i < cfg.symbols.length; i++) {
            var stock = {};
            this.log("Calling quote for stock: " + cfg.symbols[i])
            try {
		        stock.quotes = await yfinance2.quoteSummary(cfg.symbols[i], {modules: ['price']});
	        } catch (error) {
				stock.quotes = "";
				console.error("Error in loading quote data for Symbol "+ cfg.symbols[i]);
				self.log(error);
			};
            try {
				stock.historical = await yfinance2._chart(cfg.symbols[i], {period1: moment().subtract(cfg.chartDays, 'days').format('YYYY-MM-DD')});
            } catch (error) {
				stock.historical = "";
				console.error("Error in loading historical data for Symbol "+ cfg.symbols[i])
			};
			this.log(stock);
            this.log(stock.historical.quotes);
            self.sendSocketNotification("UPDATE_STOCK", stock);
        }
    },
    
      
    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    },
})
