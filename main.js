
/* Import alarm codes and configuration parameters */
var codes = require('./codes.json');
var config = require('./config.json');

// Will remove all letters from the code
function sanitizeCode(code) {
  return code.replace(/\D/g, '');
}

// Will create a JSON structure containing the alarm information
function createAlarmJson(timestamp, code, municipality, address, message) {
  var codeInfo = codes[sanitizeCode(code)];
  var alarm = {};
  alarm.timestamp = timestamp.toJSON();
  if (codeInfo) {
    alarm.code = code;
    alarm.class = codeInfo.class;
    alarm.text = codeInfo.text;
  } else {
    alarm.code = code;
  }
  if (municipality) {
    alarm.municipality = municipality;
  }
  if (address) {
    alarm.address = address;
  }
  if (message) {
    alarm.message = message;
  }
  alarm.our_units = config.our_units;
  alarm.thresholds = config.thresholds;
  return alarm;
}

// Will broadcast the given alarm created by createAlarmJson(..) to all websocket clients
function sendAlarmJson(alarm) {
  var json = JSON.stringify(alarm);
  console.log('Sending alarm to all websocket clients: ' + json);
  var count = 0;
  wss.clients.forEach(function each(client) {
    client.send(json);
    count++;
  });
  console.log('Alarm sent to ' + count + ' client(s)');
}

// Set up Express
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/ui'));

// Set up some HTTP endpoints for testing the alarms
app.get('/send-fake-alarm', function(req, res) {
  console.log('Sending fake alarm');
  var alarm = createAlarmJson(new Date(), '402A', 'PARGAS', 'SKOLGATAN 1', 'RVSIT3,RVSPG11,RVSK11,RVSPG31,RVSPG13,RVSPG23,RVSPG16,,provalarm');
  sendAlarmJson(alarm);
  res.send('Fake alarm sent');
});

// Start the HTTP server
var server = app.listen(config.port);

// Set up Websockets
var wss = new require('ws').Server({server: server});

// Log incoming web socket connections (to make debugging easier)
wss.on('connection', function connection(ws) {
  console.log('Incomming websocket connection to ' + ws.upgradeReq.url);
});
