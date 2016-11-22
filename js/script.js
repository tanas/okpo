$(document).ready(function () {
    var table = $('.table'),
        renredButton = $('.render'),
        chartElement = $('#chart'),
        labelNames = ['Защищенность', 'Интренсивность отражения угрозы', 'Интренсивность контроля', 'Интенсивность воздействия'],
        dataFromTable = [],
        TABLE_INIT_ROWS = 10,
        TABLE_DATA_COLS = 4,
        
        //Коофициент маштаба
        B = 2,
        
        wma = new WMA({ period: B, values: []}),
        ema = new EMA({ period: B, values: []}),
        chart, LCL,
        
        //Целевая функция
        targetFunc = 1;

    // Вероятность отражения угрозы
    var pOt = 0.85;

    // Защищенность
    // v_ot: интенсивность отражения угрозы
    // v_k: интенсивность контроля
    // v_v: интенсивность воздействия угрозы
    function calcTargetValue(v_ot, v_k, v_v){
        var t_ob = 1 / v_ot;
        var t_k = 1 / v_k;
        var v_n = v_v * (1 - pOt);
        var t_n = 1 / v_n;

        var k = t_n / (t_n + t_ob + t_k);

        return k.toFixed(2);

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

    function rand() {
        return Math.random().toFixed(2);
    }

    function fillTableWithData() {

        var cells = $('.cell');

        for(var i =0; i < TABLE_INIT_ROWS; i ++){
            var index = i * TABLE_DATA_COLS;

            $(cells[index + 1]).val(rand());
            $(cells[index + 2]).val(rand());
            $(cells[index + 3]).val(rand());

            $(cells[index]).val(calcTargetValue($(cells[index + 1]).val(), $(cells[index + 2]).val(), $(cells[index + 3]).val()));
        }

    }

    function recalcUData() {

        var cells = $('.cell');

        for(var i =0; i < TABLE_INIT_ROWS; i ++){
            var index = i * TABLE_DATA_COLS;
            $(cells[index]).val(calcTargetValue($(cells[index + 1]).val(), $(cells[index + 2]).val(), $(cells[index + 3]).val()));
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