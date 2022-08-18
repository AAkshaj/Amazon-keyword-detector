$(function () {
    var tooltipReader = new FileReader();
    $('#tooltip-csv').change(function(){
        tooltipReader.readAsText($('#tooltip-csv').get(0).files[0]);
        tooltipReader.onload = function(e) {
            var csv = $.csv.toArrays(tooltipReader.result);
            var ret = [];
            if(csv) {
                csv.forEach(function (p1, p2, p3) { ret.push(p1[0]);});
                chrome.runtime.sendMessage({action: 'multiPage', csv: ret});
            }
        };
    });
});