var HTTPS = require('https');

var botID = process.env.BOT_ID;

const fs = require('fs');

var request = require('request');
var in_array = require('in-array');
var mysql = require('mysql');
var async = require('async');
var moment = require('moment');

db_url = process.env.CLEARDB_DATABASE_URL;
var conn = mysql.createConnection(db_url);


var my_clan_name = "Elite Raiders"; // Your clan name
var war_call_timer = 6; // Timer for calls. How long until a call expires.
var user_name = "";
var user_id = "";
var caller_code = "mer77";

String.prototype.post_text = function() {
  console.log("GM: " + this.valueOf());
  request.post('https://api.groupme.com/v3/bots/post', {
    form: {
      "bot_id": botID,
      "text": this.valueOf()
    }
  });
}

String.prototype.save_log = function() {
  console.log("Log: " + this.valueOf());
  conn.query('INSERT INTO `log` (message, time) VALUES (?,?)', [this.valueOf(), (new Date().getTime())]);
}

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

function fetch_cc() {
  json = fs.readFileSync('cc.json', 'utf-8');
  ob = JSON.parse(json);
  return ob.code;
}

function save_cc(c) {
  ob = {
    code: c
  }
  json = JSON.stringify(ob);
  fs.writeFileSync('cc.json', json);
}

function save_code_db(code){
  conn.query('UPDATE `clash_caller` SET caller_code = ?', [code]);
}
function get_hours(n) {
  return 1000 * 60 * 60 * n;
}

function get_diff(call_time, check_time) {
  st_ = new Date(check_time).getTime();
  ct_ = new Date(call_time).getTime() + get_hours(war_call_timer);
  diff_ = st_ - ct_;
  if (diff_ > 0) {
    return "expired";
  } else {
    return diff_;
  }
}

function get_time_diff(check_time, war_start) {
  time = 0;
  if (check_time < war_start) {
    time = war_start - check_time;
  } else {
    time = war_start + get_hours(24) - check_time;
  }
  return hm(time);
}

function get_calls(b_) {
  ret_ = [];
  check_time_ = new Date((check_time = b_.general.checktime)).getTime()
  war_start_ = new Date((war_start = b_.general.starttime)).getTime();
  war_started_ = check_time_ < war_start_;
  for (i in b_.calls) {
    in_ = parseInt(b_.calls[i].posy) + 1;
    call_time = b_.calls[i].calltime;
    call_time_ = new Date(call_time).getTime();
    if (call_time_ < war_start_) {
      call_time = war_start;
    }
    time = get_diff(call_time, check_time);
    if (time != 'expired' || war_started_) {
      if (war_started_) {
        time_ = '(called)';
      } else {
        time_ = hm(time);
      }
      stars_ = 0;
      if ((st_ = parseInt(b_.calls[i].stars)) > 1) {
        stars_ = st_ - 2;
      }
      ret_[in_] = {
        'playername': b_.calls[i].playername,
        'stars': stars_,
        'expire': time_
      }
    }
  }
  return ret_;
}

function get_bases(b_) {
  ret_ = [];
  for (i in b_.calls) {
    in_ = parseInt(b_.calls[i].posy);
    if (typeof ret_[in_] == 'undefined') {
      ret_[in_] = [];
    }
    ret_[in_].push(b_.calls[i]);
  }
  return ret_;
}
exports.is_user_admin = function(user_id){

  txt = fs.readFileSync('admins.txt', 'utf-8');
  admins = txt.split(',');
  ad_ = [];
  for (a in admins) ad_.push(admins[a].trim());
  return in_array(ad_, user_id);

}
exports.get_log = function(){
  conn.query('SELECT * FROM `log`', function(err, res, fld){
    message_ = [];
    if(res.length > 0){
      for(i in res){
        message_.push(moment(res[i].time).format("MMMM Do, h:mm:ss a") + ": " + res[i].message);
      }
      message_.join("\n").post_text();
    }else{
      "Nothing logged".post_text();
    }
  });
}
exports.clear_log = function(){
  conn.query('DELETE FROM `log` WHERE 1', function(err, res, fld){
    "Log cleared".post_text();
  });
}
exports.cc_url = function() {
  cc_code_ = fetch_cc();
  gm_text_ = 'http://clashcaller.com/war/' + cc_code_;
  gm_text_.post_text();
  return gm_text_;
}
exports.cc_code = function() {
  cc_code_ = fetch_cc();
  return cc_code_;
}
exports.config = function(data) {
  caller_code = data.cc;
  user_name = data.name;
  user_id = data.id;
}
exports.delete_call = function(number) {
  if(number > 50){
    "Invalid number".post_text();
    return;
  }
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    bases_ = get_bases(b_)[number - 1];
    found = false;
    posx_ = 0;
    if(typeof bases_ != 'undefined'){
      posx_ = bases_.length;
      for (j in bases_) {
        console.log(bases_[j]);
        if (bases_[j].playername == user_name && !found) {
          posx_ = bases_[j].posx;
          found = true;
        }
      }
    }
    if (found) {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'DELETE_CALL',
          'warcode': caller_code,
          'posy': number - 1,
          'posx': posx_
        }
      }, function(err, http, body) {
        gm_text_ = "Deleted calls on #" + number + " by " + user_name;
        gm_text_.save_log();
        gm_text_.post_text();
      });
    } else {
      gm_text_ = "You have no calls on #" + number + ", " + user_name;
      gm_text_.post_text();
    }

  });
}
exports.start_war = function(war_size, enemy_name) {
  war_id = '';
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'CREATE_WAR',
      'cname': my_clan_name,
      'ename': enemy_name,
      'size': war_size,
      'timer': war_call_timer,
      'searchable': 0
    }
  }, function(err, http, body) {
    war_test = /war\//;
    if (war_test.test(body)) {
      war_id = body.replace(/war\//, '');
      save_code_db(war_id);
      gm_text_ = "Started new clash caller (" + war_id + "). Type:\n/cc - to view link";
      gm_text_.post_text();
    }
  });
}
exports.update_stars = function(number, stars) {
  if(number > 50){
    "Invalid number".post_text();
    return;
  }
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    bases_ = get_bases(b_)[number - 1];
    found = false;
    posx_ = 0;
    if(typeof bases_ != 'undefined'){
      posx_ = bases_.length;
      for (j in bases_) {
        console.log(bases_[j]);
        if (bases_[j].playername == user_name && !found) {
          posx_ = bases_[j].posx;
          found = true;
        }
      }
    }
    if (found) {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'UPDATE_STARS',
          'warcode': caller_code,
          'posy': number - 1,
          'posx': posx_,
          'value': stars + 2
        }
      }, function(err, http, body) {
        gm_text_ = "Logged " + stars + " stars on #" + number;
        gm_text_.save_log();
        gm_text_.post_text();
      });
    } else {
      gm_text_ = "You have no calls on #" + number + ", " + user_name;
      gm_text_.post_text();
    }
  });
}
exports.update_timer = function(what, timer){
  timer_regex_ = /([\d]{1,2})h([\d]{1,2})m/;
  start_ = false;
  if(timer_regex_.test(timer)){
    start_ = ((what == 'start') ? 's' : ((what == 'end') ? 'e' : false));
    mx_ = timer.match(timer_regex_);
    mins_ = (parseInt(mx_[0]) * 60) + parseInt(mx_[1]);
    if(start_){
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'UPDATE_WAR_TIME',
          'warcode': caller_code,
          'start': start_,
          'minutes': mins_
        }
      }, function(err, http, body) {
        gm_text_ = "Updated war timer " + what + " to " + timer;
        gm_text_.save_log();
        gm_text_.post_text();
      });
    }else{
      "Invalid war start status. Either put 'start' or 'end'".post_text();
    }
  }else{
    "Invalid timer. Format: ##h##m".post_text();
    return;
  }
}
exports.call = function(number, user_name) {
  if(number > 50){
    "Invalid number".post_text();
    return;
  }
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    called_ = get_calls(b_)[number];
    if (typeof called_ == 'undefined') {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'APPEND_CALL',
          'warcode': caller_code,
          'posy': number - 1,
          'value': user_name
        }
      }, function(err, http, body) {
        gm_text_ = "Called #" + number + " for " + user_name;
        gm_text_.save_log();
        gm_text_.post_text();
      });
    } else {
      if(called_.stars > 0){
        request.post('http://clashcaller.com/api.php', {
          form: {
            'REQUEST': 'APPEND_CALL',
            'warcode': caller_code,
            'posy': number - 1,
            'value': user_name
          }
        }, function(err, http, body) {
          gm_text_ = "Called #" + number + " for " + user_name;
          gm_text_.save_log();
          gm_text_.post_text();
        });
      }else{
        gm_text_ = "#" + number + " called by " + called_.playername + " " + called_.expire;
        gm_text_.post_text();
      }
    }
  });
}
exports.get_call = function(number) {
  if(number > 50){
    "Invalid number".post_text();
    return;
  }
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    called_ = get_calls(b_)[number];
    if (typeof called_ == 'undefined') {
      gm_text_ = "Target #" + number + " open";
    } else {
      if (called_.stars > 0) {
        gm_text_ = "#" + number + " attacked by " + called_.playername + " for " + called_.stars + " stars";
      } else {
        gm_text_ = "#" + number + " called by " + called_.playername + " " + called_.expire;
      }
    }
    gm_text_.post_text();
  });
}
exports.get_calls = function() {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    ret_ = get_calls(b_);
    message_ = [];

    war_start_ = new Date(b_.general.starttime).getTime();
    check_time_ = new Date(b_.general.checktime).getTime();

    time_ = get_time_diff(check_time_, war_start_);
    if (check_time_ < war_start_) {
      message_.push("(Prep day) war starts in: " + time_);
    } else {
      message_.push("(War day) war ends in: " + time_);
    }

    for (i in ret_) {
      star_str_ = "";
      if (ret_[i].stars > 0) {
        for (j = 0; j < ret_[i].stars; j++) star_str_ += "*";
        star_str_ = " (" + star_str_ + ")";
      }
      message_.push("#" + i + " - " + ret_[i].playername + " " + ret_[i].expire + star_str_);
    }
    if (message_.length == 1) {
      message = 'No calls yet';
    } else {
      message = message_.join('\n');
    }
    message.post_text();
  });
}
