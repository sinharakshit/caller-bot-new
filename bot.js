var HTTPS = require('https');
var cool = require('cool-ascii-faces');

var botID = process.env.BOT_ID;

var JsonDB = require('node-json-db');
var db = new JsonDB("db", true, true);

function respond() {
  var request = JSON.parse(this.req.chunks[0]);

  admins = ['17624791', '19208102', '16450105', '18421801', '7542037', '26392945', '33665734', '19566769', '25167010'];
  user_id = request.sender_id;
  user_name = request.name;
  user_info = [user_id, user_name];
  input = request.text;
  message = "";
  var regex_ = {
    call: /^\/call (\d+)$/,
    clear_call: /^\/delete call (\d+)$/,
    get_call: /^\/get call (\d+)$/,
    get_calls: /^\/get calls$/,
    attack: /^\/attacked (\d+) for (\d+) star[s]?$/,
    reset_war: /^\/reset war$/,
    get_stats: /^\/get stats$/,
    help: /^\/help$/,
    reset_war_time: /^\/reset war time (\d+)h\s?(\d+)m$/
  }
  for (index in regex_) {
    if (regex_[index].test(input)) {
      switch (index) {
        case 'call':
          num_ = parseInt(input.match(regex_[index])[1]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc = db.getData(this_);
          if (cc.calls == '') {
            db.push(this_ + "/calls", user_info, true);
            message = "Called #" + num_ + " for " + user_name;
          } else {
            message = "Target #" + num_ + " already called by " + cc.calls[1];
          }
          break;

        case 'clear_call':
          num_ = parseInt(input.match(regex_[index])[1]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc = db.getData(this_);
          db.push(this_ + "/calls", '', true);
          message = "Calls on #" + num_ + " deleted";
          break;
        case 'get_call':
          num_ = parseInt(input.match(regex_[index])[1]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc = db.getData(this_);
          if (cc.calls == '') {
            message = "#" + num_ + " open";
          } else {
            message = "#" + num_ + " called by " + cc.calls[1];
          }
          break;

        case 'get_calls':
          cc = db.getData("/calls/roster");
          ret_ = "";
          for (i in cc) {
            if (cc[i].calls != '') {
              ret_ += cc[i].index + " - " + cc[i].calls[1] + "\n";
            }
          }
          if (ret_ == '') {
            message = 'No calls yet';
          } else {
            message = ret_;
          }
          break;

        case 'attack':
          num_ = parseInt(input.match(regex_[index])[1]);
          stars_ = parseInt(input.match(regex_[index])[2]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          db.push(this_ + "/stars", stars_);
          db.push(this_ + "/calls", user_info);
          message = "Logged " + stars_ + " stars on " + num_;
          break;

        case 'get_stats':
          cc = db.getData("/calls/roster");
          ret_ = "";
          for (i in cc) {
            if (cc[i].stars > '') {
              ret_ += cc[i].index + " - " + cc[i].stars + " stars by " + cc[i].calls[1] + "\n";
            }
          }
          if (ret_ == '') {
            message = 'No logged attacks yet';
          } else {
            message = ret_;
          }
          break;

        case 'reset_war':
          do_it = false;
          for (j = 0; j < admins.length; j++) {
            if (user_id == admins[j]) {
              do_it = true;
            }
          }
          if (do_it) {
            for (i = 0; i < 50; i++) {
              obj_ = {
                index: i + 1,
                calls: '',
                stars: 0
              }
              db.push("/calls/roster[" + i + "]", obj_, true);
            }
            message = "All calls cleared";
          } else {
            message = "Only admins can do this";

          }
          break;

        case 'help':
          message = "/call # - Call a target\n" +
          "/delete call # - Delete call on target\n" +
          "/get call # - Get call on target\n" +
          "/get calls - Get all calls\n" +
          "/attacked # for # stars - Log attack done on target\n" +
          "/get stats - Get logged attacks details\n" +
          "/help - Show this";
          break;
      }
    }
  }

  if (request.text && message != "") {
    this.res.writeHead(200);
    postMessage(message);
    this.res.end();
  } else {
    console.log("don't care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(text) {
  var botResponse, options, body, botReq;

  botResponse = text;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id": botID,
    "text": botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
    if (res.statusCode == 202) {
      // neat
    } else {
      console.log('rejecting bad status code ' + res.statusCode);
    }
  });

  botReq.on('error', function(err) {
    console.log('error posting message ' + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message ' + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}


exports.respond = respond;
