function findTotalinMessage(message) {
  var value = 0;
  var test1 = /Genel Toplam:<\/strong><\/td><td align="right" style="text-align:right"><strong>([0-9]*\,?[0-9]*) TL<\/strong>/;
  var test2 = /Toplam<strong> :  [\s\S]* (?:<\/strong>)?[\s\S]([0-9]*\,?[0-9]*) TL/;
  
  var amount = test1.exec(message)
  if (amount != null){
    value = parseFloat(amount[1].replace(',','.'));
  }
  else{
    amount = test2.exec(message);
    if (amount != null){
      value = parseFloat(amount[1].replace(',','.'));
    }
  }
  return value;
}

 function newChart(range, sheet, type) {
   var chartBuilder = sheet.newChart();
   chartBuilder.addRange(sheet.getRange(range))
       .setChartType(type)
       .setOption('title', 'Spend Graph');
   sheet.insertChart(chartBuilder.setPosition(1, 6, 0, 0).build());
 }

function yearChanged(year){
  var spreadsheet = get_or_init_spreadsheet();
  var ozet = spreadsheet.getSheetByName('ozet');
  ozet.appendRow([year+":", "=SUM('"+year+"'!B1:B1048576)"])
  
  var sheet = spreadsheet.getSheetByName(String(year));
  newChart("A:B", sheet, Charts.ChartType.LINE);
  
}
  
function get_or_init_cache(key){
  var cache = CacheService.getUserCache();
  var value = cache.get(key)
  if (value == null){
    value = 0;
  }
  return value;
}

function get_or_init_spreadsheet(){
  var cache = CacheService.getUserCache();
  var spreadsheet_url = cache.get("spreadsheet_url");
  
  if (spreadsheet_url == null){
    var spreadsheet = SpreadsheetApp.create("yemeksepeti_orders");
    spreadsheet_url = spreadsheet.getUrl();
    cache.put("spreadsheet_url", spreadsheet_url);
    var ozet = spreadsheet.getActiveSheet();
    ozet.setName('ozet');
    ozet.appendRow(["","","Toplam:","=sum(B2:B1048576)"]);
    newChart("A:B", ozet, Charts.ChartType.BAR);
    ozet.autoResizeColumn(1);
    
  } else {
    var spreadsheet = SpreadsheetApp.openByUrl(spreadsheet_url);
  }

  
  return spreadsheet;

}

function getOrderConfirmations() {
  var total = parseFloat(get_or_init_cache('total'));
  var current = parseInt(get_or_init_cache('current'));
  var messages = [];
  var cache = CacheService.getUserCache();
  var spreadsheet = get_or_init_spreadsheet();
  var current_year = 0;
  var threads = GmailApp.search('subject: "yemeksepeti sipariş onay "  from:yemeksepeti.com');

  for (var i = current; i < threads.length; i++) {
    var message = threads[i].getMessages()[0];
    var message_body = message.getBody();
    var amount = findTotalinMessage(message_body);
    if (isNaN(amount)){
      amount = 0
    }
    total += amount
    
    year = message.getDate().getYear();
    
    var sheet = spreadsheet.getSheetByName(String(year));
    if ( sheet == null){
      sheet = spreadsheet.insertSheet(String(year));
    }
    if (year != current_year){
      yearChanged(year);
      current_year = year;
    }

    sheet.appendRow([message.getDate(), amount, total, message.getDate().getMonth(), message.getDate().getDay()]);
    //Utilities.sleep(500);
    cache.put("current", i);
    cache.put("total", total);
  }
  Logger.log(total);
  resetCache();
  return total;
} 

function doGet() {
  //return resetCache();
  //return viewCache();
  
  return HtmlService.createHtmlOutput("Total Spent: " + getOrderConfirmations());
}


function resetCache(){
  // Cache seems to be set again after this function. 
  var cache = CacheService.getUserCache();
  cache.put("current", 0);
  cache.put("total", 0);
  cache.remove("current");
  cache.remove("total");
  cache.remove("spreadsheet_url");
  
  cache.put("current", 0);
  cache.put("total", 0);
  
  Logger.log("reset cache");
  return HtmlService.createHtmlOutput("reset cache "+ cache.get('current') + cache.get('total'));
}  
  
function viewCache(){
  var cache = CacheService.getUserCache();
  return HtmlService.createHtmlOutput("view cache "+ cache.get('current') + cache.get('total'));
}
