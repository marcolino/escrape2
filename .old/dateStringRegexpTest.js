var dateString = '2014 Maggio 18, 09:25:38 am';
var dateStandardRE = /(\d{4}) (\w+) (\d{1,2}), (\d{2}):(\d{2}:(\d{2}) ([ap]m))/;
var dateStandard = dateStandardRE.exec(dateString);
console.log('result:', dateStandard);