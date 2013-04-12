Pushbin-web
=============

Required Envs
-------------

    TWITTER_CONSUMER_KEY
    TWITTER_CONSUMER_SECRET
    FIREBASE_SECRET
    SESSION_SECRET # Any secret value

Security rules
--------------

### Set

    curl -X PUT -d @security_rules.json "https://pushbin.firebaseio.com/.settings/rules.json?auth=$FIREBASE_SECRET"

### Get

    curl -o security_rules.json "https://pushbin.firebaseio.com/.settings/rules.json?auth=$FIREBASE_SECRET"
