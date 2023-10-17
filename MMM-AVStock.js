Module.register("MMM-AVStock", {
    defaults: {
        apiKey : "",
        timeFormat: "DD-MM HH:mm",
        symbols : ["AAPL", "GOOGL", "TSLA"],
        alias: [],
        locale: config.language,
        width: null,
        height: 200,
        direction: 'row',
        classes: 'xsmall',
        callInterval: 1000*2*60,
        mode : "table",                  // "table", "ticker", "grid", "series"
        tickerDuration: 20,
        chartDays: 90,
        tableHeaders: ["symbol", "price", "close", "change", "changeP", "pPrice", "perf2P", "volume"],
        tableHeaderTitles: {
            symbol: "Symbol", 
            price: "Price", 
            close: "Close", 
            change: "CHG", 
            changeP: "CHG%", 
            pPrice: "Purch", 
            perf2P: "Profit", 
            volume: "Vol"
        },
        maxTableRows: null,
        showChart: true,
        chartWidth: null,
        showVolume: true,
        chartInterval: "daily",          // choose from ["intraday", "daily", "weekly", "monthly"]
        intraDayInterval: "5min",        // choose from ["1min", "5min", "15min", "30min", "60min"]
        movingAverage: {
            type: "SMA",
            periods: [200]
        },
        decimals : 2,
        activeHours: [8, 22],
        chartType: 'line',
        chartUpdateInterval: 30*1000,
        pureLine: false,
        chartNavigator: false,
        chartLineColor: '#eee',
        chartLabelColor: '#eee',
        coloredCandles: true,
        purchasePrice: [0,0,0],
        showPurchasePrices: false,
        showPerformance2Purchase: false,
        debug: false,
    },

    getScripts: function() {
        return [
            this.file("node_modules/highcharts/highstock.js"),
        ];
    },

    getStyles: function() {
        return [
            "MMM-AVStock.css",
        ];
    },

    start: function() {
        this.sendSocketNotification("INIT", this.config);
        this.stocks = {};
        for (var i = 0; i < this.config.symbols.length; i++) {
            this.stocks[this.config.symbols[i]] = {
                quotes: {},
                hist: {}
            };
        };
        this.log(this.stocks)
        this.loaded = false;
        if (!this.config.showPurchasePrices) this.config.tableHeaders.splice(this.config.tableHeaders.indexOf("pPrice"), 1);
        if (!this.config.showPerformance2Purchase) this.config.tableHeaders.splice(this.config.tableHeaders.indexOf("perf2P"), 1);
        this.log(this.config.tableHeaders);
    },

    notificationReceived: function(noti, payload) {
        if (noti == "DOM_OBJECTS_CREATED") {
            this.log(this.name + " initializing...")
            this.sendSocketNotification("GET_STOCKDATA", this.config);
            var self = this;
            setInterval(() => {
                self.log("Requesting stock Data");
                self.sendSocketNotification("GET_STOCKDATA", self.config);
                self.log(this.name + " requesting stock data...")
            }, this.config.callInterval);
        }
    },


    getStockName: function(symbol) {
        var stockAlias = symbol;
        var i = this.config.symbols.indexOf(symbol);
        stockAlias = (this.config.alias[i]) ? this.config.alias[i] : stockAlias;
        return stockAlias;
    },


    switchTable: function(page) {
        var tbl = document.getElementById("AVSTOCK_TABLE");
        tbl.innerHTML = "";

        var thead = document.createElement("thead");
        var tr = document.createElement("tr");
        for (var i in this.config.tableHeaders) {
            var td = document.createElement("td");
            td.innerHTML = this.config.tableHeaderTitles[i];
            td.className = this.config.tableHeaders[i];
            tr.appendChild(td);
        }
        thead.appendChild(tr);
        tbl.appendChild(thead);

        var pages = Math.ceil(this.config.symbols.length / this.config.maxTableRows);
        var rowCount = Math.min(this.config.maxTableRows, this.config.symbols.length);
        var rows = ((pages > 1) && (page == pages-1)) ? (this.config.symbols.length % (page*rowCount)) : rowCount;
        this.log(rowCount + " rowCount, " + pages + " Pages, Page 0, " + rows + " rows");

        var self = this;

        for (let i = page*rowCount; i < (page*rowCount + rows) ; i++) {
            var symbol = this.config.symbols[i];
            var hashId = symbol.hashCode();
            var tr = document.createElement("tr");
            tr.className = "stock_tr";
            if (i % 2 != 0) tr.style.backgroundColor = '#333'
            tr.id = "STOCK_" + hashId;
            for (let j = 0 ; j < this.config.tableHeaders.length; j++) {
                var td = document.createElement("td");
                var stockAlias = this.getStockName(symbol);
                td.innerHTML = (j != 0) ? (this.stocks[symbol].quote) ? this.stocks[symbol]["quote"][this.config.tableHeaders[j]] : "---" : stockAlias;
                td.className = this.config.tableHeaders[j];
                td.id = this.config.tableHeaders[j] + "_" + hashId;
                tr.appendChild(td);
            }
            if (this.config.showChart) {
                tr.addEventListener("click", function () {
                    self.log("Clicked on " + self.config.symbols[i]);
                    self.updateChart(self.stocks[self.config.symbols[i]]);
                });
            }
            tbl.appendChild(tr);
        }
        if (pages > 1) {
            for (let k = 0; k < pages; k++) {
                var circle = document.getElementById("avstock-ind-" + k);
                if (k == page) {
                    circle.classList.add("bright","active-nav")
                } else {
                    circle.classList.remove("bright","active-nav")
                }
            }
        }

    },


    getDom: function() {
        var mode = this.config.mode;
        var wrapper = document.createElement("div");
        wrapper.id = "AVSTOCK";
        wrapper.style.flexDirection = this.config.direction;
        wrapper.className = this.config.classes;
        
        var elWrapper = document.createElement("div");
        elWrapper.className = mode + "-wrapper "
        elWrapper.style.width = (this.config.width == null) ? '100%' : this.config.width + 'px';

        if (mode == "table") {
            var headerRow = document.createElement("div");
            headerRow.className = "table-header";
            for (var i = 0; i < this.config.tableHeaders.length; i++) {
                var headerDiv = document.createElement("div");
                headerDiv.className = "table-header-item";
                headerDiv.innerHTML = this.config.tableHeaderTitles[this.config.tableHeaders[i]];
                headerRow.appendChild(headerDiv);
            }
            elWrapper.appendChild(headerRow);
        }
       
        var self = this;
        for (let i = 0; i < this.config.symbols.length; i++) {
            this.log("Adding item...");
            var stock = this.config.symbols[i];
            var pPrice = this.config.purchasePrice[i] || 0;
            var item = document.createElement("div");
            item.className = "stock_item stock " + this.getStockData(stock, "up") + " " + this.getStockData(stock, "profit");
            item.id = mode + "_stock_" + stock;

            var symbol = document.createElement("div");
            symbol.className = "symbol item_sect";
            symbol.innerHTML = this.getStockName(stock);
            symbol.id = mode + "_symbol_" + stock;

            var price = document.createElement("div");
            price.className = "price";
            price.innerHTML = this.getStockData(stock, "price");
            price.id = mode + "_price_" + stock;
            
            var prevClose = document.createElement("div");
            prevClose.className = "close";
            prevClose.innerHTML = this.getStockData(stock, "prevClose");
            prevClose.id = mode + "_close_" + stock;

            var anchor1 = document.createElement("div");
            anchor1.className = "anchor item_sect";

            var changeP = document.createElement("div");
            changeP.className = "changeP";
            changeP.innerHTML = this.getStockData(stock, "changeP");
            changeP.id = mode + "_changeP_" + stock;

            var change = document.createElement("div");
            change.className = "change";
            change.innerHTML = this.getStockData(stock, "change");
            change.id = mode + "_change_" + stock;

            var vol = document.createElement("div");
            vol.className = "volume xsmall";
            vol.innerHTML = this.getStockData(stock, "volume");
            vol.id = mode + "_volume_" + stock;

            var anchor2 = document.createElement("div");
            anchor2.className = "anchor item_sect";

            var purchase = document.createElement("div");
            purchase.className = "anchor item_sect";

            var purchasePrice = document.createElement("div");
            purchasePrice.className = "purchasePrice";
            purchasePrice.innerHTML = pPrice; //this.getStockData(stock, "pPrice");
            purchasePrice.id = mode + "_purchasePrice_" + stock;

            var purchaseChange = document.createElement("div");
            purchaseChange.className = "purchaseChange";
            purchaseChange.innerHTML = this.getStockData(stock, "perf2P");
            purchaseChange.id = mode + "_purchaseChange_" + stock;
            
            switch (mode) {
                case "grid":
                    item.appendChild(symbol);
                    anchor1.appendChild(price);
                    anchor1.appendChild(vol);
                    item.appendChild(anchor1);
                    anchor2.appendChild(change);
                    anchor2.appendChild(changeP);
                    item.appendChild(anchor2);            
                    if (this.config.showPurchasePrices) {
                        purchase.appendChild(purchaseChange);
                        purchase.appendChild(purchasePrice);
                        item.appendChild(purchase);
                    };
                    break;
                case "table":
                    if (i % 2 != 0) item.style.backgroundColor = '#333';
                    item.appendChild(symbol);
                    item.appendChild(price);
                    item.appendChild(prevClose);
                    item.appendChild(change);
                    item.appendChild(changeP);
                    if (this.config.showPurchasePrices) {
                        item.appendChild(purchasePrice);
                        item.appendChild(purchaseChange);
                    };
                    item.appendChild(vol);
                    break;
                case "ticker":
                    anchor1.appendChild(symbol);
                    anchor1.appendChild(price);
                    item.appendChild(anchor1);
                    anchor2.appendChild(change);
                    anchor2.appendChild(changeP);
                    item.appendChild(anchor2);            
                    if (this.config.showPurchasePrices) {
                        purchase.appendChild(purchaseChange);
                        purchase.appendChild(purchasePrice);
                        item.appendChild(purchase);
                    }
                    break;
                default: 
            };
            
            if (this.config.showChart) {
                item.addEventListener("click", function() {
                    self.log("Clicked on " + self.config.symbols[i]);
                    self.updateChart(self.config.symbols[i]);
                });
            };
            elWrapper.appendChild(item);
        };
        
        if (this.config.mode === "ticker") {
            var tickerWindow = document.createElement("div");
            tickerWindow.id = "ticker-window";
            tickerWindow.appendChild(elWrapper);
            elWrapper.style.animationDuration = this.config.tickerDuration + 's';
            //elWrapper.style.width = (this.config.symbols.length * 160) + 'px';
            wrapper.appendChild(tickerWindow)
        } else {
            wrapper.appendChild(elWrapper);
        }
        
        wrapper.appendChild(this.addTagLine());
        
        if (this.config.showChart) {
            var chartWrapper = document.createElement("div");
            chartWrapper.style.width = (this.config.width == null) ? '100%' : this.config.width + 'px';
            //chartWrapper.style.height = this.config.height+'px';

            var stockChart = document.createElement("div");
            stockChart.id = "AVSTOCK_CHART";

            var head = document.createElement("div");
            head.className = "head anchor";
            head.id = "stockchart_head";

            var symbol = document.createElement("div");
            symbol.className = "symbol item_sect";
            symbol.innerHTML = "---";
            symbol.style.marginRight = "10px";
            symbol.id = "stockchart_symbol";

            var price = document.createElement("div");
            price.className = "price";
            price.innerHTML = "---";
            price.id = "stockchart_price";

            var changeP = document.createElement("div");
            changeP.className = "changeP";
            changeP.innerHTML = "---";
            changeP.id = "stockchart_changeP";

            head.appendChild(symbol);
            head.appendChild(price);
            head.appendChild(changeP);

            chartWrapper.appendChild(head);
            chartWrapper.appendChild(stockChart);
            wrapper.appendChild(chartWrapper);
        }
        return wrapper;
    },
    
    
    addTagLine: function () {
        var tl = document.createElement("div");
        tl.className = "tagline";
        tl.style.width = (this.config.width == null) ? '100%' : this.config.width + 'px';
        tl.id = "AVSTOCK_TAGLINE";
        tl.innerHTML = "Last quote: " + (moment(this.updateTime, "x").format(this.config.timeFormat) || "---")
        return tl;
    },


    updateData: function(mode) {
        for (let i = 0; i< this.config.symbols.length; i++) {
            var stock = this.config.symbols[i];
            var item = document.getElementById(mode + "_stock_" + stock);
            item.className = "stock_item stock " + this.getStockData(stock, "up") + " " + this.getStockData(stock, "profit"); ; 
            
            var symbol = document.getElementById(mode + "_symbol_" + stock);
            symbol.innerHTML = this.getStockName(stock);

            var price = document.getElementById(mode + "_price_" + stock);
            price.innerHTML = this.getStockData(stock, "price");
            
            var changeP = document.getElementById(mode + "_changeP_" + stock);
            changeP.innerHTML = this.getStockData(stock, "changeP");
            
            var change = document.getElementById(mode + "_change_" + stock);
            change.innerHTML = this.getStockData(stock, "change");
            
            if (mode == "table") {
                var prevClose = document.getElementById(mode + "_close_" + stock);
                prevClose.innerHTML = this.getStockData(stock, "prevClose");
            };
            
            if (mode != "ticker") {
                var vol = document.getElementById(mode + "_volume_" + stock);
                vol.innerHTML = this.getStockData(stock, "volume");
            }
            if (this.config.showPerformance2Purchase) {
                var perf2P = document.getElementById(mode + "_purchaseChange_" + stock);
                perf2P.innerHTML = this.getStockData(stock, "perf2P");
            }
        }
    },
    
    
    getStockData: function (stock, value) {
        if (this.stocks.hasOwnProperty(stock)) {
            return (this.stocks[stock]["quotes"][value] || "---")
        }
        return "---"
    },


    socketNotificationReceived: function(noti, payload) {
        this.log("Notification received: " + noti);
        if (noti == "UPDATE_STOCK") {
            this.log(payload);
            var symbol = payload.quotes.price.symbol;
            this.stocks[symbol]["quotes"] = this.formatQuotes(payload.quotes);
            this.stocks[symbol]["hist"] = this.formatOHLC(payload.historical);
            this.updateData(this.config.mode);
            if (!this.loaded) { 
                this.loaded = true;
                this.log(this.name + " fully loaded...")
                var self = this;
                var count = 0;
                self.updateChart(self.config.symbols[count]);
                this.chartChanger = setInterval( function () {
                    count = (count === self.config.symbols.length-1) ? 0 : count + 1;
                    self.log("Count: " + count);
                    self.updateChart(self.config.symbols[count]);
                }, self.config.chartUpdateInterval);
            }
        }/* else if (noti == "UPDATE_QUOTES") {
            this.stocks[payload.symbol]["quotes"] = this.formatQuotes(payload);
            this.updateData(this.config.mode);
        } else if (noti == "UPDATE_HIST") {
            this.log(payload);
            if (!this.loaded) { 
                this.loaded = true;
                this.log(this.name + " fully loaded...")
                var self = this;
                var count = 0;
                self.updateChart(self.config.symbols[count]);
                var chartChanger = setInterval( function () {
                    count = (count = self.config.symbols.length) ? 0 : count + 1;
                    self.log("Count: "+count);
                    self.updateChart(self.config.symbols[count]);
                }, self.config.chartUpdateInterval);
            }
        } else if (noti == "UPDATE_TECH") {
            this.stocks[payload.symbol][payload.func] = payload.data.reverse();
        }*/
        this.log("Stocks updated.");
        this.log(this.stocks);
    },


    formatQuotes: function(stock) {
        var quotes = {};
        var stockData = stock.price;
        var stockIndex = this.config.symbols.indexOf(stockData.symbol);
        var pPrice = this.config.purchasePrice[stockIndex] || 0;
        var stockQuote = {
            symbol: stockData.symbol,
            price: this.formatNumber(stockData.regularMarketPrice, this.config.decimals),
            open: this.formatNumber(stockData.regularMarketOpen, this.config.decimals),
            high: this.formatNumber(stockData.regularMarketDayHigh, this.config.decimals),
            low: this.formatNumber(stockData.regularMarketDayLow, this.config.decimals),
            prevClose: this.formatNumber(stockData.regularMarketPreviousClose, this.config.decimals),
            change: this.formatNumber(stockData.regularMarketPrice - stockData.regularMarketPreviousClose, this.config.decimals),
            changeP: this.formatNumber((stockData.regularMarketPrice - stockData.regularMarketPreviousClose)/stockData.regularMarketPreviousClose * 100, 1) + "%",
            volume: this.formatVolume(stockData.regularMarketVolume, 0),
            pPrice: (pPrice > 0) ? this.formatNumber(pPrice, this.config.decimals) : '--',
            perf2P: (pPrice > 0) ? this.formatNumber(-(100 - (stockData.regularMarketPreviousClose/pPrice)*100), 1) + '%' : '--',
            up: (stockData.regularMarketPrice > stockData.regularMarketPreviousClose) ? "up" : (stockData.regularMarketPrice < stockData.regularMarketPreviousClose) ? "down" : "",
            requestTime: moment(stockData.regularMarketTime).format("x"),
            profit: (pPrice <= stockData.regularMarketPrice) ? "profit" : "loss"
        }
        this.updateTime = Math.max(stockQuote.requestTime, this.updateTime) || stockQuote.requestTime;
        this.log(stockQuote);
        return stockQuote
    },
    
    
    formatOHLC: function(stock) {
        this.log(stock);
        var series = stock.quotes.reverse();
        var stockIndex = this.config.symbols.indexOf(stock.meta.symbol);
        var pPrice = this.config.purchasePrice[stockIndex] || 0;
        var values = {
            ohlc: [],
            quotes: [],
            volume: []
        };
        for (var i = 0; i < series.length; i++) {
            values.ohlc.push([
                parseInt(moment(series[i].date).format("x")), // the date
                parseFloat(series[i].open), // open
                parseFloat(series[i].high), // high
                parseFloat(series[i].low), // low
                parseFloat(series[i].close) // close
            ]);
            values.quotes.push([
                parseInt(moment(series[i].date).format("x")), // the date
                parseFloat(series[i].close) // close
            ])
            values.volume.push([
                parseInt(moment(series[i].date).format("x")), // the date
                parseInt(series[i].volume) // the volume
            ]);
        }
        this.log(values);
        return values
    },
    
    
    formatNumber: function (number, digits) {
        return parseFloat(/*Math.abs(*/number/*)*/).toLocaleString(this.config.locale, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    },


    formatVolume: function(volume, digits) {
        if (volume > 9999999) {
            return this.formatNumber(volume/1000000, digits) + "m"
        } else if (volume > 700000) {
            return this.formatNumber(volume/1000000, digits+1) + "m"
        } else if (volume > 99999) {
            return this.formatNumber(volume/1000, digits) + "k"
        } else if (volume > 700) {
            return this.formatNumber(volume/1000, digits+1) + "k"
        } else if (volume == 0) {
            return ""
        } else {
            return volume
        }
    },
    

    updateChart: function(symbol) {
        this.log("Updating chart for " + symbol);
        var series = this.stocks[symbol].hist
        if (series["ohlc"]) {
            //update header
            var quote = this.stocks[symbol].quotes;
            var head = document.getElementById("stockchart_head");
            head.classList.remove("up","down","profit","loss");
            head.classList.add(quote.up, quote.profit);
            var symbolTag = document.getElementById("stockchart_symbol");
            symbolTag.innerHTML = this.getStockName(symbol);
            var priceTag = document.getElementById("stockchart_price");
            priceTag.innerHTML = quote.price;
            var changePTag = document.getElementById("stockchart_changeP");
            changePTag.innerHTML = quote.changeP;

            // set the allowed units for data grouping
            groupingUnits = [[
                    'day', [1,2,3,4,5,6,7]
                ], [
                    'week', [1,2,3,4,5,10,15,20]
                ], [
                    'month',[1,2,3,4,6,12]
                ], [
                    'year',[1]
                ]
            ];

            var stockSeries = [
                {
                    type: this.config.chartType,
                    name: symbol,
                    data: (this.config.chartType != 'line') ?  series.ohlc : series.quotes,
                    lineColor: this.config.chartLineColor,
                    yAxis: 0,
                    dataGrouping: {
                        units: groupingUnits
                    }
                }
            ];
            if (this.config.showVolume && !this.config.pureLine) {
                stockSeries.push({
                    type: 'column',
                    name: 'Volume',
                    data: series.volume,
                    lineColor: this.config.chartLineColor,
                    yAxis: 1,
                    dataGrouping: {
                        units: groupingUnits
                    }
                });
            };
            /*for (var func in stock) {
                this.log(func);
                if (func.includes("EMA") || func.includes("SMA")) {
                    stockSeries.push(
                        {
                            type: 'line',
                            name: func,
                            data: stock[func],
                            lineColor: 'orange',
                            lineWidth: 1,
                            yAxis: 0,
                            dataGrouping: {
                                units: groupingUnits
                            }
                        }
                    )
                }
            };*/
            this.log(stockSeries);

            // create the chart
            var stockChart = Highcharts.stockChart('AVSTOCK_CHART', {
                rangeSelector: {
                    selected: 1,
                    enabled: false,
                    inputEnabled: false
                },

                chart: {
                    backgroundColor: '#000',
                    plotBackgroundColor: '#000',
                    plotBorderWidth: '0',
                    zoomType: 'x',
                    width: this.config.chartWidth,
                    //margin:[0, Math.round((this.config.width-this.config.chartWidth)/2),0,Math.round((this.config.width-this.config.chartWidth)/2),0]
                },

                plotOptions: {
                    candlestick: {
                        color: (this.config.coloredCandles) ? 'red' : 'none',
                        upColor: (this.config.coloredCandles) ? 'green' : '#ddd',
                        clip: false
                    },

                    ohlc: {
                        color: (this.config.coloredCandles) ? 'red' : 'none',
                        upColor: (this.config.coloredCandles) ? 'green' : '#ddd',
                        clip: false
                    },

                    column: {
                        colorByPoint: true,
                        colors: this.getBarColors(series),
                        clip: false
                    }
                },

                yAxis: [
                    {
                        visible: !this.config.pureLine,
                        labels: {
                            enabled: !this.config.pureLine,
                            align: 'right',
                            lineWidth: 0,
                            x: -8,
                            formatter: function () {
                                return (this.value < 10) ? this.value.toFixed(2) : this.value.toFixed(0);
                            },
                            style: {
                                fontSize: '16px',
                                color: this.config.chartLabelColor
                            }
                        },
                        title: {
                            //text: 'OHLC'
                        },
                        alternateGridColor: '#223344',
                        gridLineDashStyle: 'longDash',
                        height: (this.config.showVolume && !this.config.pureLine) ? '72%' : '100%',
                        lineColor: this.config.chartLineColor,
                        lineWidth: (this.config.pureLine) ? 0 : 2,
                        gridLineWidth: (this.config.pureLine) ? 0 : 1,
                        resize: {
                            enabled: true
                        }
                    },
                    {
                        visible: !this.config.pureLine,
                        labels: {
                            align: 'right',
                            x: -8,
                            style: {
                                fontSize: '14px',
                                color: this.config.chartLabelColor
                            }
                        },

                        title: {
                            //text: 'Volume'
                        },
                        top: (this.config.showVolume && !this.config.pureLine) ? '73%' : '100%',
                        height: (this.config.showVolume && !this.config.pureLine) ? '27%' : '0%',
                        offset: 0,
                        //lineWidth: 2
                    }
                ],

                xAxis: [
                    {
                        visible: !this.config.pureLine,
                        type: 'datetime',
                        labels: {
                            style: {
                                fontSize: '16px',
                                color: this.config.chartLabelColor
                            },
                        },
                        tickPosition: 'none',
                        endOnTick: (this.config.chartType == 'line'),
                        startOnTick: (this.config.chartType == 'line'),
                        units: [
                            [
                                'millisecond', // unit name
                                [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] // allowed multiples
                            ], [
                                'second',
                                [1, 2, 5, 10, 15, 30]
                            ], [
                                'minute',
                                [1, 2, 5, 10, 15, 30]
                            ], [
                                'hour',
                                [1, 2, 3, 4, 6, 8, 12]
                            ], [
                                'day',
                                [1]
                            ], [
                                'week',
                                [1, 2]
                            ], [
                                'month',
                                [1, 3, 6]
                            ], [
                                'year',
                                null
                        ]]
                    }
                ],

                series: stockSeries,

                /*annotations: [
                    {
                        labels: [{
                            point: 'max',
                            text: 'Max'
                        }, {
                            point: 'min',
                            text: 'Min',
                        }]
                    }
                ],*/

                tooltip: {
                    split: true
                },

                exporting: {
                    enabled: false,
                },
                navigator: {
                    enabled: this.config.chartNavigator,
                },
                scrollbar: {
                    enabled: false,
                },
                credits: {
                    enabled: false,
                },
            });
            var tl = document.getElementById("AVSTOCK_TAGLINE");
            tl.innerHTML = "Last quote: " + moment(quote.requestTime, "x").format("MM-DD HH:mm");
        } else {
            console.error("Not enough data to update chart!");
        }
    },


    getBarColors: function (series) {
        var colors = [];
        var upColor = (this.config.coloredCandles) ? 'green' : this.config.chartLineColor;
        var downColor = (this.config.coloredCandles) ? 'red' : 'none';
        for (var i = 0; i < series.ohlc.length; i++) {
            colors.push(((series.ohlc[i][4] - series.ohlc[i][1]) > 0) ? upColor : downColor)
        }
        return colors;
    },


    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    },
});
