function findVenueinMessage(message){
  var venue_test1 = /<strong style="color:#cf1414;font-size:14px">([^<>]*)<\/strong>/;
  var venue = venue_test1.exec(message);
  
  if (venue == null){
    venue = "Other";
  }
  else{
    venue = venue[1];
  }

  return venue;
}


function findTotalinMessage(message) {
  var value = 0;
  var value_test1 = /Genel Toplam:<\/strong><\/td><td align="right" style="text-align:right"><strong>([0-9]*\,?[0-9]*) TL<\/strong>/;
  var value_test2 = /Toplam<strong> :  [\s\S]* (?:<\/strong>)?[\s\S]([0-9]*\,?[0-9]*) TL/;

  var amount = value_test1.exec(message)
  if (amount != null){
    value = parseFloat(amount[1].replace(',','.'));
  }
  else{
    amount = value_test2.exec(message);
    if (amount != null){
      value = parseFloat(amount[1].replace(',','.'));
    }
  }
  return value;
}

 function newChart(range, sheet, type, position) {
   var chartBuilder = sheet.newChart();
   
   var x = position*20 + 1;
   chartBuilder.addRange(sheet.getRange(range))
       .setChartType(type)
       .setOption('title', 'Spend Graph')
       .setOption('sliceVisibilityThreshold', 0.01);
   sheet.insertChart(chartBuilder.setPosition(x, 7, 0, 0).build());
 }

function yearChanged(year){
  var spreadsheet = get_or_init_spreadsheet();
  var ozet = spreadsheet.getSheetByName('ozet');
  ozet.appendRow([year+":", "=SUM('"+year+"'!B1:B1048576)"])
  
  var sheet = spreadsheet.getSheetByName(String(year));
  newChart("A:B", sheet, Charts.ChartType.LINE, 0);
  newChart("D:E", sheet, Charts.ChartType.PIE, 1);
  
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
    newChart("A:B", ozet, Charts.ChartType.BAR, 0);
    ozet.autoResizeColumn(1);
    
  } else {
    var spreadsheet = SpreadsheetApp.openByUrl(spreadsheet_url);
  }

  
  return spreadsheet;

}

function removeTrigger(triggerId) {

  // Loop over all triggers.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    var t = allTriggers[i].getUniqueId();
    if (t == triggerId){
      ScriptApp.deleteTrigger(allTriggers[i]);
      break;
    }
  }
}

function removeAllTriggers() {

  // Loop over all triggers.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    var t = allTriggers[i].getUniqueId();
    Utilities.sleep(10000);
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
}


function getOrderConfirmations() {
  var total = parseFloat(get_or_init_cache('total'));
  var current = parseInt(get_or_init_cache('current'));
  var messages = [];
  var cache = CacheService.getUserCache();
  var spreadsheet = get_or_init_spreadsheet();
  var current_year = get_or_init_cache('current_year');
  var threads = GmailApp.search('subject: "yemeksepeti sipariş onay "  from:yemeksepeti.com');
  
  for (var i = current; i < threads.length; i++) {
    var message = threads[i].getMessages()[0];
    var message_body = message.getBody();
    var amount = findTotalinMessage(message_body);
    var venue = findVenueinMessage(message_body);
    if (isNaN(amount)){
      amount = 0;
    }
    total += amount;
    
    year = message.getDate().getYear();
    
    var sheet = spreadsheet.getSheetByName(String(year));
    if ( sheet == null){
      sheet = spreadsheet.insertSheet(String(year));
    }
    if (year != current_year){
      yearChanged(year);
      current_year = year;
    }
    var percentage = "=COUNTIF(D1:B10000,D"+ (sheet.getLastRow() + 1) +")/COUNTUNIQUE(D1:D10000)"
    sheet.appendRow([message.getDate(), amount, total, venue, percentage]);
    //Utilities.sleep(500);
    cache.put("current", i);
    cache.put("total", total);
    cache.put("current_year", current_year);
    
    /*removeTrigger(cache.get('trigger_id'));

    var trigger = ScriptApp.newTrigger('getOrderConfirmations')
      .timeBased()
      .after(30000)
      .create();
    var trigger_id = trigger.getUniqueId();
    cache.put('trigger_id', trigger_id);
    */
  }
  Logger.log(total);
  
  var spreadsheet_url = cache.get("spreadsheet_url");
  resetCache();
  return "Total spent: " +total + "<a href='" + spreadsheet_url + "'>View report</a>";
} 

function doPost(eventInfo){
  return HtmlService.createHtmlOutput(getOrderConfirmations());
}

function doGet() {
  //return resetCache();
  //return viewCache();
 // return HtmlService.createHtmlOutputFromFile('index.html');
  return HtmlService.createHtmlOutput(getOrderConfirmations());
}


function resetCache(){
  // Cache seems to be set again after this function. 
  var cache = CacheService.getUserCache();
  cache.put("current", 0);
  cache.put("total", 0);
  cache.remove("current");
  cache.remove("total");
  cache.remove("spreadsheet_url");
  cache.remove("current_year");
  
  cache.put("current", 0);
  cache.put("total", 0);
  
  Logger.log("reset cache");
  return HtmlService.createHtmlOutput("reset cache "+ cache.get('current') + cache.get('total'));
}  
  
function viewCache(){
  var cache = CacheService.getUserCache();
  return HtmlService.createHtmlOutput("view cache "+ cache.get('current') + cache.get('total'));
}
