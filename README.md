# GroupMe Clash Bot

### Prerequisites:
 - Git - https://git-scm.com/downloads
 - Node.js - https://nodejs.org/en/download/
 - Heroku Toolbelt - https://toolbelt.heroku.com/

### Steps:
 - Create account on Heroku.com
 - Clone the code:
```
git clone https://github.com/butttons/clash-caller.git caller-bot
```
 - Go into directory:
```
cd caller-bot
```
 - Login into heroku:
```
heroku login
```
 - Create the app:
```
heroku create
```
 -- This will return a link to your heroku app. Copy that. The link will be like:
```
https://XXXXXX-XXXXX-XXXXX.herokuapp.com/
```
 - Go to [GroupMe Developer Website](https://dev.groupme.com/) and log in using your GroupMe details.
 - Go to https://dev.groupme.com/bots and click on 'Create Bot'
 - Set the group the bot will reside in, its name, and in the *Callback URL* field, put the heroku app link you got from above step (https://XXXXXX-XXXXX-XXXXX.herokuapp.com/)
 - Submit, you will be redirected to the bots index page. Copy the *Bot ID* of your Bot from here.
 - In terminal, in your directory where you made the app, create a config variable on heroku using:
```
heroku config: set BOT_ID='YOUR_BOT_ID_HERE'
```
 - After setting up the variable, upload the files using:
```
git add .
git commit -am "first push"
git push heroku master
```
