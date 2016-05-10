var HTTPS = require('https');
var cool = require('cool-ascii-faces');

var botID = process.env.BOT_ID;

var JsonDB = require('node-json-db');
var db = new JsonDB('db', true, true);
var request = require('request');
var in_array = require('in-array');
var sleep = require('sleep');
var my_clan_name = "my_clan";
var war_call_timer = 6;


function hm(t) {
  t = Math.abs(t);
  var h = Math.floor(t / 3600000);
  if (h > 0) {
    var m = Math.floor((t - h * 3600000) / 60000);
    var ret = h + 'h ' + m + 'm';
    return "(" + ret + ")";
  }
  var m = Math.floor((t - h * 3600000) / 60000);
  if (m > 0) {
    var ret = m + 'm';
    return "(" + ret + ")";
  }
  return '1m';
}

function get_hours(n) {
  return 1000 * 60 * 60 * n;
}

function get_diff(call_time, check_time){
  st_ = new Date(check_time).getTime();
  ct_ = new Date(call_time).getTime() + get_hours(war_call_timer);
  diff_ = st_ - ct_;
  if(diff_ > 0){
    return "expired";
  }else{
    return diff_;
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function is_admin(user_id){
  admins = ['17624791', '19208102', '16450105', '18421801', '7542037', '26392945', '19566769', '25167010', '33665734'];
  return in_array(admins, user_id);
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
        'cname': 'Reddit Mu',
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
      db.delete('/clash_caller/info');
      db.push('/clash_caller/info', b_.general);

      check_time = b_.general.checktime;
      check_time_ = new Date(b_.general.checktime).getTime();
      war_start_ = new Date(b_.general.starttime).getTime() - get_hours(1);

      for(c in b_.calls){
        call_time = b_.calls[c].calltime;
        time = get_diff(call_time, check_time);
        this_ = "/calls/roster[" + (b_.calls[c].posy) + "]";
        st_ = parseInt(b_.calls[c].stars) - 2;
        if(st_ <= 0) st_ = 0;
        if(time != 'expired' || check_time_ < war_start_){
          db.push(this_ + "/calls", b_.calls[c].playername);
          db.push(this_ + "/stars", st_);
        }else{
          db.push(this_ + "/calls", '');
          db.push(this_ + "/stars", 0);
        }
      }
    });
  },
  delete_call: function(number) {
    for(j = 0; j < 5; j++){
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'DELETE_CALL',
          'warcode': this.cc,
          'posy': number - 1,
          'posx': j
        }
      }, function(err, http, body) {
        console.log("Deleted calls on #" + number);
      });
    }
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
function time_diff(org) {
    d = new Date();
    t_ = (d.getTime() / 1000) - (Date.parse(org) / 1000);
    t_ /= 60;
    return Math.floor(t_);
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
  img_ = false;

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
    cc_code: /^\/cc\s*$/,
    sexy_pic: /^\/nsfw\s*$/
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
        case 'sexy_pic':
          message = "https://groupme.com/join_group/21845882/OFir1M";
          break;

        case 'start_war':
          do_it = is_admin(user_id);
          if (do_it) {
            for (i = 0; i < 50; i++) {
              obj_ = {
                index: i + 1,
                calls: '',
                stars: 0,
                expire: 0
              }
              db.push("/calls/roster[" + i + "]", obj_, true);
            }
            num_ = parseInt(input.match(regex_[index])[1]);
            enemy_name_ = input.match(regex_[index])[2];
            cc_.start_war(num_, enemy_name_);
            message = "Started new clash caller. Type /cc to view";
          }else{
            message = "Only admins can create new caller, " + user_name;
          }
          break;

        case 'cc_code':
          cc_.get_full_update();
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
          sleep.usleep(500000);
          num_ = parseInt(input.match(regex_[index])[1]);
          cc = db.getData("/clash_caller/calls[0]");
          ret_ = [];
          got_eet = false;
          for (i in cc) {
            in_ = parseInt(cc[i].posy) + 1;
            if(num_ == in_){
                message = "#" + num_ + " called by " + cc[i].playername;
                got_eet = true;
            }
          }
          if(!got_eet){
            message = "#" + num_ + " open";
          }
          break;

        case 'get_calls':
        cc_.get_full_update();
        sleep.sleep(1);

        cc = db.getData("/clash_caller/calls[0]");
        ret_ = [];
        cc_info = db.getData("/clash_caller/info");
        check_time = cc_info.checktime;

        check_time_ = new Date(cc_info.checktime).getTime()
        war_start_ = new Date(cc_info.starttime).getTime() - get_hours(1);
        war_started_ = check_time_ < war_start_;

        for (i in cc) {
          in_ = parseInt(cc[i].posy) + 1;
          call_time = cc[i].calltime;
          time = get_diff(call_time, check_time);
          if(time != 'expired' || war_started_){
            if(war_started_){
              time_ = '(called)';
            }else{
              time_ = hm(time);
            }
            if ((st_ = parseInt(cc[i].stars)) > 1) {
              star_str_ = "";
              for (j = 0; j < st_ - 2; j++) star_str_ += "*";
              ret_[in_] = cc[i].playername + " (" + star_str_ + ")" + " " + time_;
            } else {
              ret_[in_] = cc[i].playername + " " + time_;
            }
          }
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
          cc_.get_full_update();
          sleep.usleep(500000);
          cc = db.getData(this_);
          if (cc.calls == '') {
            cc_.update_call(num_, user_name);
          }
          sleep.sleep(1);
          cc_.update_stars(num_, stars_);
          db.push(this_ + "/stars", stars_);
          db.push(this_ + "/calls", user_info);
          cc_.get_full_update();

          message = "Logged " + stars_ + " stars on " + num_;
          break;

        case 'get_stats':
          cc_.get_full_update();
          sleep.usleep(500000);
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
                stars: 0,
                expire: 0
              }
              db.push("/calls/roster[" + i + "]", obj_, true);
            }
            message = "All calls cleared";
          } else {
            message = "Only admins can do this";
          }
          break;

        case 'help':
          message =  "#COMMMANDS:\n" +
            "/cc - Get clash caller link\n" +
            "/call # - Call a target\n" +
            "/delete call # - Delete call on target\n" +
            "/get call # - Get call on target\n" +
            "/get calls - Get all calls\n" +
            "/attacked # for # stars - Log attack done on target\n" +
            "/get stats - Get logged attacks details\n" +
            "/help - Show this\n" +
            "/cool guy - cool guy face\n" +
            "/nsfw - ;)";
          break;

        case 'cool':
          message = cool();
          break;
      }
    }
  }

  if (request_.text && message != "") {
    this.res.writeHead(200);
    postMessage(message, img_);
    this.res.end();
  } else if(request_.text){
    this.res.writeHead(200);
    if(request_.text[0] == "/"){
      message = "Invalid command: " + request_.text + ". Type /help to view commands";
      console.log(message);
      postMessage(message, img_);
    }
    this.res.end();
  } else {
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(text, image) {
  var botResponse, options, body, botReq;

  botResponse = text;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  if(image){
    body = {
      "bot_id": botID,
      "text": "",
      "picture_url": image
    };
  }else{
    body = {
      "bot_id": botID,
      "text": botResponse
    };
  }

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
