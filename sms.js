
var SerialPort = require('serialport');
var port = new SerialPort('/dev/cu.HUAWEIMobile-Pcui', {
  parser: SerialPort.parsers.readline('\n')
});

const COMMAND_HANDLER_TIMEOUT = 10000;

function CommandHandler(command, callbackSuccess, callbackError) {
  this._buffer = [];
  this._command = command;
  this._dataReceived = false;
  this._success = callbackSuccess;
  this._error = callbackError;
}

CommandHandler.prototype = {
  onData: function(data) {
    var trimmedData = ('' + data).trim();
    console.log('Data received in response to <' + this._command + '>: ' + trimmedData);
    if (!this._dataReceived && trimmedData === this._command) {
      this.resetTimer();
      this._dataReceived = true;
    } else if (this._dataReceived) {
      if (trimmedData === 'ERROR' && this._error) {
        this.stopTimer();
        this._error(this._buffer);
      } else if (trimmedData === 'OK' && this._success) {
        this.stopTimer();
        this._success(this._buffer);
      } else {
        this.resetTimer();
        this._buffer.push(trimmedData);
      }
    }
  },

  onTimeout: function() {
    console.log('Timeout while waiting for response to <' + this._command + '>, treating as error');
    if (this._error) {
      this._error(this._buffer);
    }
  },

  resetTimer: function() {
    this.stopTimer();
    this._timer = setTimeout(this.onTimeout.bind(this), COMMAND_HANDLER_TIMEOUT);
  },

  stopTimer: function() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
};

port._currentHandler = null;

port.sendCommand = function(command, success, error) {
  console.log('Sending command <' + command + '>');
  port._currentHandler = new CommandHandler(command,
    function(buf) {
      console.log('Command <' + command + '> completed successfully');
      port._currentHandler = null;
      if (success) {
        success(buf);
      }
    },
    function(buf) {
      console.log('Command <' + command + '> completed with an error');
      port._currentHandler = null;
      if (error) {
        error(buf);
      }
    });
  setTimeout(function() {
    port.write(command + '\r');
    port._currentHandler.resetTimer();
  }, 400);
};

port.on('data', function (data) {
  if (port._currentHandler) {
    port._currentHandler.onData(data);
  } else {
    console.log('Data received without current handler: ' + data);
  }
});

port.on('error', function(err) {
  console.log('Error: ', err.message);
});

port.on('disconnect', function(err) {
  console.log('Port disconnected');
});

function enableModemMemory(success) {
  port.sendCommand('AT+CPMS="ME"', success, function(buf) {
    setTimeout(enableModemMemory, 5000, success); // Try again
  });
};

function enablePDUMode(success) {
  port.sendCommand('AT+CMGF=0', success, function(buf) {
    setTimeout(enablePDUMode, 5000, success); // Try again
  });
};

function listPDUMessages(success) {
  port.sendCommand('AT+CMGL=4', success, function(buf) {
    setTimeout(listPDUMessages, 5000, success); // Try again
  });
};

port.on('open', function() {
  console.log('Port opened');
  enableModemMemory(function(buf) {
    enablePDUMode(function(buf) {
      listPDUMessages(function(buf) {
        console.log(buf);
      });
    });
  });
});
