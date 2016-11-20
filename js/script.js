$(document).ready(function () {
    var table = $('.table'),
        renredButton = $('.render'),
        chartElement = $('#chart'),
        labelNames = ['Практичность U', 'Понятность пригодности M11 (успешное завершение функций с первой попытки)', 'Понятность пригодности M12 (корректность описания функций пользователем)', 'Обучаемость', 'Простота использования', 'Эстетичность пользовательского интерфейса'],
        dataFromTable = [],
        TABLE_INIT_ROWS = 10,
        TABLE_DATA_COLS = 6,
        
        //Коофициент маштаба
        B = 2,
        
        wma = new WMA({ period: B, values: []}),
        ema = new EMA({ period: B, values: []}),
        chart, LCL,
        
        //Целевая функция
        targetFunc = 1;

        //Количество пользователей, участвовавших в тестировании
        userCount = 3;
        
        //Кол. тест. функций
        testActionsCount = 10;

        v1Coefficient = 0.7; // весовой коэффициент m11 подхарактеристики практичности.
        v2Coefficient = 0.3; // весовой коэффициент m12 подхарактеристики практичности.

    //Практичность U
    function getU(m11, m12){
        return m11 * v1Coefficient + m12 * v2Coefficient;
    }

    //Мера качества m11 (успешное завершение функций с первой попытки) 
    function getM11(){
        var f = 0, f1 = 0;
        for(var i = 0; i < userCount; i++){
            f1 = randomInteger(5, testActionsCount); //количество успешно за-вершенных i-ым пользователем функций
            // testActionsCount общее количество вызванных i-ым пользователем функций
            f += f1 / testActionsCount;
        }

        return f / userCount;
    }

    //Мера качества m12 (корректность описания функций пользователем) 
    function getM12(){
        var d = 0, d1 = 0;
        for(var i = 0; i < userCount; i++){
            d1 = randomInteger(6, testActionsCount); //количество корректно описанных i-ым пользователем функций
            
            // testActionsCount общее количество функций описанных i-ым пользователем.
            d += d1 / testActionsCount;
        }

        return d / userCount;
    }


    //Мера качества m2 (простота изучения функций) 
    function getM2(){
        var h = 0, h1 = 0, h2 = 0;
        for(var i = 0; i < userCount; i++){
            h1 = randomInteger(5, testActionsCount); //– количество успешно за-вершенных i-ым пользователем функций после обращения к документации;
            h2 = randomInteger(8, testActionsCount); //количество обращений к документации i-ым пользователя
            h += h1/h2;
        }

        return h / userCount;
    }

    //Мера качества m3 (логичность и последовательность функциональных действий)
    function getM3(){
        var a = 0;
        for(var i = 0; i < userCount; i++){
            a += randomInteger(1, 5); //количество информаци-онных сообщений или функциональных возможностей, которые i-ый пользователь нашел не-последовательными (нелогичными)
        }
  
        //testActionsCount общее количество ин-формационных сообщений
        return 1 - a / (userCount * testActionsCount);
    }

    //Мера качества m4 (адаптируемость пользовательского интерфейса)
    function getM4(){
        var c = 0;
        for(var i = 0; i < userCount; i++){
            c += randomInteger(1, 7); //количество элементов пользовательского интерфейса которые может настраивать i-ый пользователь;
        }
        
        // testActionsCount общее коли-чество элементов пользовательского интерфейса.
        return 1 - c / (userCount * testActionsCount);
    }

    function randomInteger(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;
    }

    function getLCL(k, rowNumber) {
        return targetFunc - B * getSigma(k, rowNumber) * getLCLsqrt(k);
    }

    function getSigma(k, rowNumber) {
        var xSum = 0,
            xCur = dataFromTable[rowNumber][k],
            n = dataFromTable[rowNumber].length;

        dataFromTable[rowNumber].forEach(function(elem) {
            xSum += Math.pow(elem - xCur, 2);
        });

        return Math.sqrt(xSum/n);
    }

    function getLCLsqrt(k) {
        var lambda = 0.2,
            part1 = lambda/(2 - lambda),
            part2 = 1 - Math.pow((1 - lambda),(2*k+1));

        return Math.sqrt(part1 * part2);
    }


    initTable(TABLE_INIT_ROWS);

    fillTableWithData();

    renredButton.click(onRenderClick);
    onRenderClick();

    function onRenderClick() {
        var dataset,
            labelsX = [];

        // обновляем целевую функцию
        targetFunc = $('.targetFunc').val() || targetFunc;

        recalcUData();

        getDataFromTable();

        for(var i = 1; i <= TABLE_INIT_ROWS; i++) {
            labelsX.push(i);
        }

        function getRandomColor() {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++ ) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }

        dataset = dataFromTable.map(function (line, i) {

            return {
                label: labelNames[i],
                fill: false,
                borderColor: getRandomColor(),
                borderWidth: 2,
                data: line.map(function(elem, num) {
                    return {
                        x: num,
                        y: elem
                    };
                })
            };
        });

        dataFromTable.map(function (line, i) {
            dataset.push({
                label: 'LCL:' + labelNames[i],
                fill: false,
                borderColor: getRandomColor(),
                borderWidth: 2,
                borderDash: [5, 15],
                data: line.map(function(elem, num) {
                    var lcl = getLCL(num, i);
                    return {
                        x: num,
                        y: lcl
                    };
                })
            });
        });

        // An exponential moving average (EMA), also known as an exponentially weighted moving average (EWMA)
        // https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
        dataFromTable.map(function (line, i) {
            dataset.push({
                label: 'EWMA:' + labelNames[i],
                fill: false,
                borderColor: getRandomColor(),
                borderWidth: 1,
                borderDash: [15, 25],
                data: line.map(function(elem, num) {
                    return {
                        x: num,
                        y: ema.nextValue(elem) || elem
                    };
                })
            });
        });


        if (chart) chart.clear();

        chart = new Chart(chartElement, {
                type: 'line',
                data: {
                    labels: labelsX,
                    datasets: dataset
                },
                options: {
                    scales: {
                        xAxes: [{
                            display: true
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                show: true,
                                labelString: 'Value'
                            },
                            ticks: {
                                suggestedMin: 0,
                                suggestedMax: 1
                            }
                        }]
                    }
                }
            });
    }

    function getDataFromTable() {
        var rows = table.find('tr');

        dataFromTable = [];
        for (var i = 0; i < TABLE_DATA_COLS; i++) {
            dataFromTable.push([]);
        }

        for (var i = 1; i < rows.length; i++) {
            $(rows[i]).children('td').map(function(j) {
                if (j === 0) return;

                var val = $(this).find('input').val();

                if (val)
                    return dataFromTable[j-1].push(parseFloat(val));
            }).get();
        }
    }

    function fillTableWithData() {

        var cells = $('.cell');

        for(var i =0; i < TABLE_INIT_ROWS; i ++){
            var index = i * TABLE_DATA_COLS;

            $(cells[index + 1]).val(getM11().toFixed(2));
            $(cells[index + 2]).val(getM12().toFixed(2));
            $(cells[index]).val( getU($(cells[index + 1]).val(), $(cells[index + 2]).val()).toFixed(2));

            $(cells[index + 3]).val( getM2().toFixed(2));
            $(cells[index + 4]).val( getM3().toFixed(2));
            $(cells[index + 5]).val( getM4().toFixed(2));
        }

    }

    function recalcUData() {

        var cells = $('.cell');

        for(var i =0; i < TABLE_INIT_ROWS; i ++){
            var index = i * TABLE_DATA_COLS;
            $(cells[index]).val( getU($(cells[index + 1]).val(), $(cells[index + 2]).val()).toFixed(2));
        }

    }
    

    function randomNum() {
        return (Math.random() * 100).toFixed(2);
    }

    function initTable(n) {
        var rows = [],
            colsNum = table.find('td').length,
            row, el;

        for (var i = 0; i < n; i++) {
            row = [];

            for (var j = 0; j < colsNum; j++) {
                if (j === 0) {
                    el = i + 1;
                } else {
                    el = '<input type="text" class="cell form-control"/>';
                }

                row.push('<td>' + el + '</td>');
            }

            rows.push('<tr>' + row + '</tr>');
        }

        table.append(rows);
    }
});