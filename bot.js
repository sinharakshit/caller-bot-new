var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var botID = process.env.BOT_ID;
var JsonDB = require('node-json-db');
var db = new JsonDB("db", true, true);
var request = require('request');

var my_clan_name = "My clan";

function is_admin(user_id) {
  admins = [];
  do_it = false;
  for (j = 0; j < admins.length; j++) {
    if (user_id == admins[j]) {
      do_it = true;
    }
  }
  return do_it;
}

function clash_caller(code) {
  db.push('/clash_caller/code', code, true);
  this.cc = code;
}
clash_caller.prototype = {
  constructor: clash_caller,
  start_war: function(war_size, enemy_name) {
    war_id = '';
    request.post('http://clashcaller.com/api.php', {
      form: {
        'REQUEST': 'CREATE_WAR',
        'cname': my_clan_name,
        'ename': enemy_name,
        'size': war_size,
        'timer': 6,
        'searchable': 0
      }
    }, function(err, http, body) {
      war_test = /war\//;
      if (war_test.test(body)) {
        war_id = body.replace(/war\//, '');
        db.push('/clash_caller/code', war_id, true);
        console.log(war_id);
      }
    });
  },
  set_code: function(code) {
    db.push('/clash_caller/code', code, true);
    this.cc = code;
  },
  update_call: function(number, name) {
    all_calls = db.getData('/clash_caller/calls');
    go = true;
    for (c in all_calls[0]) {
      if (all_calls[0][c].posy == number - 1) {
        console.log('Already called #' + number);
        go = false;
      }
    }
    if (go) {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'APPEND_CALL',
          'warcode': this.cc,
          'posy': number - 1,
          'value': name
        }
      }, function(err, http, body) {
        console.log("Called #" + number + " for " + name);
      });
    }
  },
  get_full_update: function() {
    request.post('http://clashcaller.com/api.php', {
      form: {
        'REQUEST': 'GET_FULL_UPDATE',
        'warcode': this.cc
      }
    }, function(err, http, body) {
      b_ = JSON.parse(body);
      for (i = 0; i < 50; i++) {
        obj_ = {
          index: i + 1,
          calls: '',
          stars: 0
        }
        db.push("/calls/roster[" + i + "]", obj_, true);
      }
      db.delete('/clash_caller/calls');
      db.push('/clash_caller/calls[]', b_.calls);
      for (c in b_.calls) {
        st_ = parseInt(b_.calls[c].stars) - 2;
        if (st_ <= 0) st_ = 0;
        this_ = "/calls/roster[" + (b_.calls[c].posy) + "]";
        db.push(this_ + "/calls", b_.calls[c].playername);
        db.push(this_ + "/stars", st_);
      }
    });
  },
  delete_call: function(number) {
    request.post('http://clashcaller.com/api.php', {
      form: {
        'REQUEST': 'DELETE_CALL',
        'warcode': this.cc,
        'posy': number - 1,
        'posx': 0
      }
    }, function(err, http, body) {
      console.log("Deleted calls on #" + number);
    });
  },
  update_stars: function(number, stars) {
    request.post('http://clashcaller.com/api.php', {
      form: {
        'REQUEST': 'UPDATE_STARS',
        'warcode': this.cc,
        'posy': number - 1,
        'posx': 0,
        'value': stars + 2
      }
    }, function(err, http, body) {
      console.log("Logged " + stars + " stars on #" + number);
    });
  }
}


function respond() {
  var request_ = JSON.parse(this.req.chunks[0]);

  cc_code = db.getData('/clash_caller/code');
  cc_ = new clash_caller(cc_code);
  cc_.get_full_update();

  user_id = request_.sender_id;
  user_name = request_.name;
  user_info = [user_id, user_name];
  input = request_.text;
  message = "";

  var regex_ = {
    call: /^\/call (\d+)\s*$/,
    clear_call: /^\/delete call (\d+)\s*$/,
    get_call: /^\/get call (\d+)\s*$/,
    get_calls: /^\/get calls\s*$/,
    attack: /^\/attacked (\d+) for (\d+) star[s]?\s*$/,
    reset_war: /^\/reset war\s*$/,
    get_stats: /^\/get stats\s*$/,
    help: /^\/help\s*$/,
    cool: /^\/cool guy\s*$/,
    start_war: /^\/start war (\d+)\s+(.*)\s*$/,
    cc_code: /^\/cc\s*$/
  }
  for (index in regex_) {
    if (regex_[index].test(input)) {
      switch (index) {
        case 'call':
          num_ = parseInt(input.match(regex_[index])[1]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc = db.getData(this_);
          cc_.get_full_update();
          if (cc.calls == '') {
            db.push(this_ + "/calls", user_info, true);
            cc_.update_call(num_, user_name);
            message = "Called #" + num_ + " for " + user_name;
          } else {
            message = "Target #" + num_ + " already called by " + cc.calls;
          }
          break;
        case 'start_war':
          do_it = is_admin(user_id);
          if (do_it) {
            for (i = 0; i < 50; i++) {
              obj_ = {
                index: i + 1,
                calls: '',
                stars: 0
              }
              db.push("/calls/roster[" + i + "]", obj_, true);
            }
            num_ = parseInt(input.match(regex_[index])[1]);
            enemy_name_ = input.match(regex_[index])[2];
            cc_.start_war(num_, enemy_name_);
            message = "Started new clash caller. Type /cc to view";
          } else {
            message = "Only admins can create new caller, " + user_name;
          }
          break;

        case 'cc_code':
          cc_code_ = db.getData('/clash_caller/code');
          message = "http://www.clashcaller.com/war/" + cc_code_;
          break;

        case 'clear_call':
          num_ = parseInt(input.match(regex_[index])[1]);
          cc_.delete_call(num_);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          db.push(this_ + "/calls", '', true);
          db.push(this_ + "/stars", 0, true);
          cc_.get_full_update();
          message = "Calls on #" + num_ + " deleted";
          break;

        case 'get_call':
          cc_.get_full_update();
          num_ = parseInt(input.match(regex_[index])[1]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc = db.getData(this_);
          if (cc.calls == '') {
            message = "#" + num_ + " open";
          } else {
            message = "#" + num_ + " called by " + cc.calls;
          }
          break;

        case 'get_calls':
          cc_.get_full_update();
          cc = db.getData("/clash_caller/calls[0]");
          ret_ = [];
          for (i in cc) {
            in_ = parseInt(cc[i].posy) + 1;
            ret_[in_] = cc[i].playername;
          }
          message_ = [];
          for (i in ret_) {
            message_.push("#" + i + " - " + ret_[i]);
          }
          if (message_.length == 0) {
            message = 'No calls yet';
          } else {
            message = message_.join("\n");
          }
          break;

        case 'attack':
          num_ = parseInt(input.match(regex_[index])[1]);
          stars_ = parseInt(input.match(regex_[index])[2]);
          this_ = "/calls/roster[" + (num_ - 1) + "]";
          cc_.update_stars(num_, stars_);
          db.push(this_ + "/stars", stars_);
          db.push(this_ + "/calls", user_info);
          cc_.get_full_update();
          message = "Logged " + stars_ + " stars on " + num_;
          break;

        case 'get_stats':
          cc_.get_full_update();
          cc = db.getData("/calls/roster");
          ret_ = [];
          for (i in cc) {
            if (cc[i].stars > 0) {
              ret_.push("#" + cc[i].index + " - " + cc[i].stars + " stars by " + cc[i].calls);
            }
          }
          if (ret_.length == 0) {
            message = 'No logged attacks yet';
          } else {
            message = ret_.join("\n");
          }
          break;

        case 'reset_war':
          do_it = is_admin(user_id);
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
          message = "/cc - Get clash caller link\n" +
            "/call # - Call a target\n" +
            "/delete call # - Delete call on target\n" +
            "/get call # - Get call on target\n" +
            "/get calls - Get all calls\n" +
            "/attacked # for # stars - Log attack done on target\n" +
            "/get stats - Get logged attacks details\n" +
            "/help - Show this";
          break;

        case 'cool':
          message = cool();
          break;
      }
    }
  }

  if (request_.text && message != "") {
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
