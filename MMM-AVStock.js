
String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
    return hash;
    }
    for (var i = 0; i < this.length; i++) {
    var char = this.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};


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
        classes: 'small',
        callInterval: 1000*60*5,
        mode : "table",                  // "table", "ticker", "grid", "series"
        tickerDuration: 20,
        chartDays: 90,
        tableHeaders: ["symbol", "price", "close", "change", "changeP", "pPrice", "perf2P", "volume"],
        tableHeaderTitles: ["Symbol", "Price", "Close", "CHG", "CHG%", "Purch", "Profit", "Vol"],
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
            this.file("node_modules/highcharts/modules/no-data-to-display.js")
        ];
    },

    getStyles: function() {
        return [
            "MMM-AVStock.css",
            //this.file("node_modules/highcharts/css/highcharts.css")
        ];
    },


    getTemplate: function() {
        return 'MMM-AVStock.njk';
    },

    
    getTemplateData: function() {
        this.log("Updating template");
        this.log(this.stocks);
        return {
            loading: !this.loaded,
            config: this.config,
            width: (this.config.width == null) ? "100%" : this.config.width+"px",
            stocks: this.stocks,
        }
    },


    start: function() {
        this.sendSocketNotification("INIT", this.config);
        this.stocks = {};
        this.loaded = false;
    },

    notificationReceived: function(noti, payload) {
        if (noti == "DOM_OBJECTS_CREATED") {
            this.sendSocketNotification("GET_STOCKDATA", this.config);
            //this.prepare();
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

    prepareGrid: function() {
        var wrapper = document.getElementById("AVSTOCK");
        wrapper.innerHTML = "";
        var gridWrapper = document.createElement("div");
        gridWrapper.className = "grid-wrap";
        gridWrapper.style.width = (this.config.width == null) ? '100%' : this.config.width + 'px';

        var grid = document.createElement("div");
        grid.className = "grid";

        var self = this;
        for (let i = 0; i < this.config.symbols.length; i++) {
            var stock = this.config.symbols[i];
            var pPrice = this.config.purchasePrice[i] || 0;
            var hashId = stock.hashCode();
            var gridItem = document.createElement("div");
            gridItem.className = "stock_item stock";
            gridItem.id = "grid_STOCK_" + hashId;

            var symbol = document.createElement("div");
            symbol.className = "symbol item_sect";
            symbol.innerHTML = this.getStockName(stock);
            symbol.id = "grid_symbol_" + hashId;

            var price = document.createElement("div");
            price.className = "price";
            price.innerHTML = "---";
            price.id = "grid_price_" + hashId;

            var change = document.createElement("div");
            change.className = "change";
            change.innerHTML = "---";
            change.id = "grid_change_" + hashId;

            var vol = document.createElement("div");
            vol.className = "volume xsmall";
            vol.innerHTML = "---";
            vol.id = "grid_volume_" + hashId;

            var anchor = document.createElement("div");
            anchor.className = "anchor item_sect";

            var purchase = document.createElement("div");
            purchase.className = "anchor item_sect";

            var purchasePrice = document.createElement("div");
            purchasePrice.className = "purchasePrice";
            purchasePrice.innerHTML = (this.config.purchasePrice[i]) ? this.formatNumber(this.config.purchasePrice[i], this.config.decimals) : "--",
            purchasePrice.id = "grid_purchasePrice_" + hashId;

            var purchaseChange = document.createElement("div");
            purchaseChange.className = "purchaseChange";
            purchaseChange.innerHTML = "--%";
            purchaseChange.id = "grid_purchaseChange_" + hashId;



            if (this.config.showChart) {
                gridItem.addEventListener("click", function() {
                    self.log("Clicked on " + self.config.symbols[i]);
                    self.updateChart(self.stocks[self.config.symbols[i]]);
                });
            }
            gridItem.appendChild(symbol);
            gridItem.appendChild(price);
            anchor.appendChild(change);
            anchor.appendChild(vol);
            gridItem.appendChild(anchor);

            if (this.config.showPurchasePrices) {
                purchase.appendChild(purchaseChange);
                purchase.appendChild(purchasePrice);
                gridItem.appendChild(purchase);
            }

            grid.appendChild(gridItem);
        }
        gridWrapper.appendChild(grid);
        if (!this.config.showChart) gridWrapper.appendChild(this.addTagLine());
        wrapper.appendChild(gridWrapper);
    },

    
    socketNotificationReceived: function(noti, payload) {
        this.log("Notification received: "+noti);
        if (noti == "UPDATE_QUOTES") {
            this.stocks.quotes = this.formatQuotes(payload);
            //this.update();
        } else if (noti == "UPDATE_HIST") {
            this.stocks.series = this.formatOHLC(payload);
        } else if (noti == "UPDATE_TECH") {
            this.stocks[payload.symbol][payload.func] = payload.data.reverse();
        }
        this.updateDom();
        this.log("Stocks updated!");
        this.log(JSON.stringify(this.stocks));
        if (!this.loaded) { 
            this.loaded = true;
            var self = this;
            var count = 0;
            setTimeout( () => {
                self.updateChart(self.config.symbols[count]);
            }, 1500);
            var chartInterval = setInterval( function () {
                count = (count = self.config.symbols.length) ? 0 : count + 1;
                self.updateChart(self.config.symbols[count]);
            }, self.config.chartUpdateInterval);
        }
    },


    formatQuotes: function(data) {
        var quotes = {};
        this.log(data);
        for (var stock in data) {
            var stockData = data[stock].price;
            var stockIndex = this.config.symbols.indexOf(stock);
            var pPrice = this.config.purchasePrice[stockIndex] || 0;
            var stockQuote = {
                symbol: stock,
                date: moment(stockData.regularMarketTime).format("x"),
                price: this.formatNumber(stockData.regularMarketPrice, this.config.decimals),
                open: this.formatNumber(stockData.regularMarketOpen, this.config.decimals),
                high: this.formatNumber(stockData.regularMarketDayHigh, this.config.decimals),
                low: this.formatNumber(stockData.regularMarketDayLow, this.config.decimals),
                close: this.formatNumber(stockData.regularMarketPreviousClose, this.config.decimals),
                change: this.formatNumber(stockData.regularMarketPrice - stockData.regularMarketPreviousClose, this.config.decimals),
                changeP: this.formatNumber((stockData.regularMarketPrice - stockData.regularMarketPreviousClose)/stockData.regularMarketPreviousClose * 100, this.config.decimals) + "%",
                volume: this.formatVolume(stockData.regularMarketVolume, 0),
                pPrice: (pPrice > 0) ? this.formatNumber(pPrice, this.config.decimals) : '--',
                perf2P: (pPrice > 0) ? this.formatNumber((100 - (stockData.regularMarketPreviousClose/pPrice)*100), 1) + '%' : '--',
                up: (stockData.regularMarketPrice > stockData.regularMarketPreviousClose) ? "up" : (stockData.regularMarketPrice < stockData.regularMarketPreviousClose) ? "down" : "",
                requestTime: moment(stockData.regularMarketTime).format("x"),
                profit: (pPrice < stockData.regularMarketPreviousClose)
            }
            this.log(stockQuote);
            quotes[stock] = stockQuote;
        }
        this.log(quotes);
        return quotes
    },
    
    
    formatOHLC: function(data) {
        var stockSeries = {};
        for (var stock in data) {
            var series = data[stock].reverse();
            var stockIndex = this.config.symbols.indexOf(stock);
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
            stockSeries[stock] = values;
        }
        this.log(stockSeries);
        return stockSeries
    },
    
    
    formatNumber: function (number, digits) {
        return parseFloat(Math.abs(number)).toLocaleString(this.config.locale, {
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
    

    update: function(stock) {
        if (this.config.mode === "table") {
            this.updateTable(this.stocks[stock]);
        } else if (this.config.mode === "ticker"){
            this.updateTicker(this.stocks[stock]);
        } else if (this.config.mode === "grid"){
            this.updateGrid(this.stocks[stock]);
        }
        if (this.config.showChart) {
            this.updateChart(this.stocks[stock]);
        }
    },

    
    updateTable: function(stock) {
        var hash = stock.quote.hash;
        var tr = document.getElementById("STOCK_" + hash);
        var ud = (stock.quote.up) ? "up" : "down"
        for (var j = 1 ; j < this.config.tableHeaders.length ; j++) {
            var tdId = this.config.tableHeaders[j] + "_" + hash;
            var td = document.getElementById(tdId);
            td.innerHTML = stock.quote[this.config.tableHeaders[j]];
            td.className = this.config.tableHeaders[j];
            if (td.className == "perf2P") { td.classList.add((stock.quote.profit) ? "profit" : "loss"); }
        }
        tr.className = "animated stock_tr " + ud;
        var tl = document.getElementById("AVSTOCK_TAGLINE");
        tl.innerHTML = "Last quote: " + quote.requestTime;
        setTimeout(() => {
            tr.className = "stock_tr " + ud;
        }, 1500);
    },

    updateGrid: function(stock) {
        var hash = stock.quote.hash;
        var gridItem = document.getElementById("grid_STOCK_" + hash);
        var priceTag = document.getElementById("grid_price_" + hash);
        priceTag.innerHTML = stock.quote.price;
        var changeTag = document.getElementById("grid_change_" + hash);
        changeTag.innerHTML = stock.quote.changeP;
        var vol = document.getElementById("grid_volume_" + hash);
        vol.innerHTML = stock.quote.volume;
        var ud = (stock.quote.up) ? "up" : "down";
        gridItem.className = "animated stock_item stock_tr " + ud;
        var ppd = (stock.quote.profit) ? "profit" : "loss";

        if (this.config.showPurchasePrices) {
            var purchasePriceTag = document.getElementById("grid_purchasePrice_" + hash);
            purchasePriceTag.className = "purchasePrice";
            var purchaseChangeTag = document.getElementById("grid_purchaseChange_" + hash);
            purchaseChangeTag.innerHTML = stock.quote.perf2P || "--%";
            purchaseChangeTag.className = "purchaseChange " + ppd;
        }

        var tl = document.getElementById("AVSTOCK_TAGLINE");
        tl.innerHTML = "Last quote: " + stock.quote.date;
        setTimeout(()=>{
            gridItem.className = "stock_item stock_tr " + ud;
        }, 1500);
    },

    updateTicker: function(stock) {
        var hash = stock.quote.hash;
        var tr = document.getElementById("STOCK_" + hash);
        var priceTag = document.getElementById("price_" + hash);
        priceTag.innerHTML = stock.quote.price;
        var changePTag = document.getElementById("changeP_" + hash);
        changePTag.innerHTML = stock.quote.changeP;
        var ud = (stock.quote.up) ? "up" : "down";
        tr.className = "animated stock_item stock_tr " + ud;

        /* spitzlbergerj - Extension ticker with line with own purchase price and the display for profit and loss */
        var ppd = (stock.quote.profit) ? "profit" : "loss";
        if (this.config.showPurchasePrices) {
            if (this.config.showPerformance2Purchase) {
                var purchaseChangeTag = document.getElementById("purchaseChange_" + hash);
                purchaseChangeTag.innerHTML = stock.quote.perf2P || "--%";
                purchaseChangeTag.className = "purchaseChange " + ppd;
            }
        }
        /* spitzlbergerj - end */

        var tl = document.getElementById("AVSTOCK_TAGLINE");
        tl.innerHTML = "Last quote: " + stock.quote.date;
        setTimeout(()=>{
            tr.className = "stock_item stock_tr " + ud;
        }, 1500);
    },

    updateChart: function(stock) {
        var series = this.stocks.series[stock]
        if (series["ohlc"]) {
            //update header
            var quote = this.stocks.quotes[stock];
            var head = document.getElementById("stockchart_head");
            head.classList.remove("up","down");
            var ud = (quote.up) ? "up" : "down";
            head.classList.add(ud);
            var symbolTag = document.getElementById("stockchart_symbol");
            symbolTag.innerHTML = this.getStockName(stock);
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
                    name: stock,
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
                    yAxis: 1,
                    dataGrouping: {
                        units: groupingUnits
                    }
                });
            };
            for (var func in stock) {
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
            };
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
                    },

                    ohlc: {
                        color: (this.config.coloredCandles) ? 'red' : 'none',
                        upColor: (this.config.coloredCandles) ? 'green' : '#ddd',
                    },

                    column: {
                        colorByPoint: true,
                        colors: this.getBarColors(series)
                    }
                },

                yAxis: [
                    {
                        visible: !this.config.pureLine,
                        labels: {
                            enabled: !this.config.pureLine,
                            align: 'right',
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


    getBarColors: function (stock) {
        var colors = [];
        var upColor = (this.config.coloredCandles) ? 'green' : this.config.chartLineColor;
        var downColor = (this.config.coloredCandles) ? 'red' : 'none';
        for (var i = 0; i < stock.ohlc.values.length; i++) {
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
